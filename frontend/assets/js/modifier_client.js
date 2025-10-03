
document.addEventListener("DOMContentLoaded", () => {
  // Initialisation du modal
  const editModal = new bootstrap.Modal(document.getElementById("editModal"));
  let currentClientId = null;

  // Gestionnaire pour le bouton Enregistrer
  document
    .getElementById("saveEditBtn")
    .addEventListener("click", saveClientChanges);

  // Fonction pour ouvrir le modal de modification
  async function openEditModal(clientId) {
    try {
      currentClientId = clientId;
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

      const client = await response.json();

      if (!client.mesures || client.mesures.length === 0) {
        throw new Error("Aucune mesure trouvée pour ce client");
      }

      const mesure = client.mesures[0];

      // Remplir le formulaire avec les données existantes
      fillEditForm(client, mesure);

      // Afficher le modal
      editModal.show();
    } catch (error) {
      console.error("Erreur:", error);
      Swal.fire(
        "Erreur",
        "Impossible de charger les données du client",
        "error"
      );
    }
  }

 
    function fillEditForm(client, mesure) {
      console.log("Remplissage du formulaire avec:", { client, mesure });

      // Remplir les champs généraux
      document.getElementById("editNom").value = client.nom || "";
      document.getElementById("editPrenom").value = client.prenom || "";
      document.getElementById("editContact").value = client.contact || "";
      document.getElementById("editAdresse").value = client.adresse || "";
      document.getElementById("editSexe").value = mesure.sexe || "Femme";

      // Gestion de la photo
      const avatarEdit = document.getElementById("avatarEdit");
      const existingPhotoInput = document.getElementById("existingPhoto");

      // 1. Déterminer le sexe (avec cas par défaut)
      const sexe = (mesure.sexe || "Femme").toLowerCase();

      // 2. Photo par défaut selon le sexe
      let photoUrl =
        sexe === "homme"
          ? "assets/images/model3.jpg"
          : "assets/images/model4.jpg";

      // 3. Si une photo existe dans les mesures, l'utiliser
      if (mesure.photoPath) {
        // Nettoyer le chemin (comme dans afficherDetailClient)
        const cleanPath = mesure.photoPath
          .replace(/^\/+/, "")
          .replace("model_photo/", "");

        photoUrl = `http://localhost:8081/model_photo/${cleanPath}`;

        // Stocker le chemin original pour la soumission
        if (existingPhotoInput) {
          existingPhotoInput.value = cleanPath;
        }
      }

      console.log("URL photo finale:", photoUrl);
      avatarEdit.src = photoUrl;
      avatarEdit.style.objectFit = "cover";

      // Gestion des erreurs de chargement
      avatarEdit.onerror = function () {
        console.error(
          "Erreur de chargement de la photo, utilisation par défaut"
        );
        this.src =
          sexe === "homme"
            ? "assets/images/model3.jpg"
            : "assets/images/model4.jpg";
        if (existingPhotoInput) {
          existingPhotoInput.value = "";
        }
      };

      // Gérer le genre dans le preview
      const genderRadio = document.querySelector(
        `input[name="genderPreviewEdit"][value="${mesure.sexe || "Femme"}"]`
      );
      if (genderRadio) {
        genderRadio.checked = true;
      }

      // Afficher les sections appropriées
      toggleMeasurementSections(mesure.sexe, mesure.typeVetement);

      // Remplir les mesures
      fillMeasurements(mesure);
    }

    // Fonction pour gérer l'upload de nouvelle photo
    document
      .getElementById("photoEditInput")
      .addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function (event) {
            const avatarEdit = document.getElementById("avatarEdit");
            avatarEdit.src = event.target.result;
            avatarEdit.style.objectFit = "cover";

            // Effacer la référence à la photo existante
            const existingPhotoInput = document.getElementById("existingPhoto");
            if (existingPhotoInput) {
              existingPhotoInput.value = "";
            }
          };
          reader.readAsDataURL(file);
        }
      });
  function toggleMeasurementSections(sexe, typeVetement) {
    // Cacher toutes les sections d'abord
    document.getElementById("femmeOptionsEdit").style.display = "none";
    document.getElementById("mesuresRobeEdit").style.display = "none";
    document.getElementById("mesuresJupeEdit").style.display = "none";
    document.getElementById("mesuresHommeEdit").style.display = "none";

    if (sexe === "Femme") {
      document.getElementById("femmeOptionsEdit").style.display = "block";

      // Sélectionner l'option appropriée
      if (typeVetement === "robe") {
        document.getElementById("femme_type_robe_edit").checked = true;
        document
          .querySelector(`.option-card[data-option="robe"]`)
          .classList.add("selected");
        document.getElementById("mesuresRobeEdit").style.display = "block";
      } else if (typeVetement === "jupe") {
        document.getElementById("femme_type_jupe_edit").checked = true;
        document
          .querySelector(`.option-card[data-option="jupe"]`)
          .classList.add("selected");
        document.getElementById("mesuresJupeEdit").style.display = "block";
      }
    } else if (sexe === "Homme") {
      document.getElementById("mesuresHommeEdit").style.display = "block";
    }
  }

  function fillMeasurements(mesure) {
    // Remplir les mesures selon le type
    if (mesure.sexe === "Femme") {
      if (mesure.typeVetement === "robe") {
        document.getElementById("robe_epaule_edit").value = mesure.epaule || "";
        document.getElementById("robe_manche_edit").value = mesure.manche || "";
        document.getElementById("robe_poitrine_edit").value =
          mesure.poitrine || "";
        document.getElementById("robe_taille_edit").value = mesure.taille || "";
        document.getElementById("robe_longueur_edit").value =
          mesure.longueur || "";
        document.getElementById("robe_fesse_edit").value = mesure.fesse || "";
        document.getElementById("robe_tour_manche_edit").value =
          mesure.tourManche || "";
        document.getElementById("robe_longueur_poitrine_edit").value =
          mesure.longueurPoitrine || "";
        document.getElementById("robe_longueur_taille_edit").value =
          mesure.longueurTaille || "";
        document.getElementById("robe_longueur_fesse_edit").value =
          mesure.longueurFesse || "";
      } else if (mesure.typeVetement === "jupe") {
        document.getElementById("jupe_epaule_edit").value = mesure.epaule || "";
        document.getElementById("jupe_manche_edit").value = mesure.manche || "";
        document.getElementById("jupe_poitrine_edit").value =
          mesure.poitrine || "";
        document.getElementById("jupe_taille_edit").value = mesure.taille || "";
        document.getElementById("jupe_longueur_edit").value =
          mesure.longueur || "";
        document.getElementById("jupe_longueur_jupe_edit").value =
          mesure.longueurJupe || "";
        document.getElementById("jupe_ceinture_edit").value =
          mesure.ceinture || "";
        document.getElementById("jupe_fesse_edit").value = mesure.fesse || "";
        document.getElementById("jupe_tour_manche_edit").value =
          mesure.tourManche || "";
        document.getElementById("jupe_longueur_poitrine_edit").value =
          mesure.longueurPoitrine || "";
        document.getElementById("jupe_longueur_taille_edit").value =
          mesure.longueurTaille || "";
        document.getElementById("jupe_longueur_fesse_edit").value =
          mesure.longueurFesse || "";
      }
    } else if (mesure.sexe === "Homme") {
      document.getElementById("homme_epaule_edit").value = mesure.epaule || "";
      document.getElementById("homme_manche_edit").value = mesure.manche || "";
      document.getElementById("homme_longueur_edit").value =
        mesure.longueur || "";
      document.getElementById("homme_longueur_pantalon_edit").value =
        mesure.longueurPantalon || "";
      document.getElementById("homme_ceinture_edit").value =
        mesure.ceinture || "";
      document.getElementById("homme_cuisse_edit").value = mesure.cuisse || "";
      document.getElementById("homme_poitrine_edit").value =
        mesure.poitrine || "";
      document.getElementById("homme_corps_edit").value = mesure.corps || "";
      document.getElementById("homme_tour_manche_edit").value =
        mesure.tourManche || "";
    }
  }

  async function saveClientChanges() {
    // Validation du formulaire
    const errors = validateEditForm();
    if (errors.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Erreur de validation",
        html: errors.join("<br>"),
      });
      return;
    }

    // Préparation des données
    const formData = new FormData(
      document.getElementById("measurementEditForm")
    );
    formData.append("id", currentClientId);

    try {
      // const response = await fetch(
      //   `http://localhost:8080/api/clients/${currentClientId}`,
      //   {
      //     method: "PUT",
      //     body: formData,
      //   }
      // );
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");

      const response = await fetch(
        `http://localhost:8081/api/clients/${currentClientId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la modification");
      }

      const result = await response.json();

      Swal.fire({
        icon: "success",
        title: "Succès",
        text: "Modifications enregistrées avec succès",
        timer: 2500,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      editModal.hide();
      // Recharger les données ou la page selon votre besoin
      location.reload();
    } catch (error) {
      console.error("Erreur:", error);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: error.message || "Échec de la modification",
      });
    }
  }

  function validateEditForm() {
    const errors = [];
    const requiredFields = [
      { id: "editNom", label: "Nom" },
      { id: "editPrenom", label: "Prénom" },
      { id: "editContact", label: "Contact" },
      { id: "editSexe", label: "Sexe" },
    ];

    requiredFields.forEach((field) => {
      const el = document.getElementById(field.id);
      if (!el || !el.value.trim()) {
        errors.push(`Le champ ${field.label} est obligatoire.`);
      }
    });

    // Validation des mesures selon le type
    const sexe = document.getElementById("editSexe").value;
    if (sexe === "Femme") {
      const typeVetement = document.querySelector(
        'input[name="femme_type_edit"]:checked'
      )?.value;
      if (!typeVetement) {
        errors.push("Veuillez sélectionner un type de vêtement.");
      } else {
        // Valider les champs obligatoires selon le type
        const requiredMeasurements =
          typeVetement === "robe"
            ? [
                "robe_epaule",
                "robe_manche",
                "robe_poitrine",
                "robe_taille",
                "robe_longueur",
                "robe_fesse",
              ]
            : [
                "jupe_epaule",
                "jupe_manche",
                "jupe_poitrine",
                "jupe_taille",
                "jupe_longueur",
                "jupe_longueur_jupe",
                "jupe_ceinture",
                "jupe_fesse",
              ];

        requiredMeasurements.forEach((field) => {
          const el = document.getElementById(`${field}_edit`);
          if (!el || !el.value.trim()) {
            errors.push(
              `Le champ ${field.replace(
                "_",
                " "
              )} est obligatoire pour ce type de vêtement.`
            );
          }
        });
      }
    } else if (sexe === "Homme") {
      const requiredMeasurements = [
        "homme_epaule",
        "homme_manche",
        "homme_longueur",
        "homme_longueur_pantalon",
        "homme_ceinture",
        "homme_cuisse",
      ];
      requiredMeasurements.forEach((field) => {
        const el = document.getElementById(`${field}_edit`);
        if (!el || !el.value.trim()) {
          errors.push(`Le champ ${field.replace("_", " ")} est obligatoire.`);
        }
      });
    }

    return errors;
  }

  // Initialisation des écouteurs d'événements
  function setupEditFormListeners() {
    // Gestion de la photo
    document.getElementById("avatarEdit").addEventListener("click", () => {
      document.getElementById("photoEditInput").click();
    });

    document
      .getElementById("photoEditInput")
      .addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function (event) {
            document.getElementById("avatarEdit").src = event.target.result;
            document.getElementById("avatarEdit").style.objectFit = "cover";
          };
          reader.readAsDataURL(file);
        }
      });

    // Gestion du changement de sexe
    document.getElementById("editSexe").addEventListener("change", function () {
      const val = this.value;
      document.getElementById("femmeOptionsEdit").style.display =
        val === "Femme" ? "block" : "none";
      document.getElementById("mesuresHommeEdit").style.display =
        val === "Homme" ? "block" : "none";

      // Reset les options femme
      if (val !== "Femme") {
        document
          .querySelectorAll('input[name="femme_type_edit"]')
          .forEach((el) => (el.checked = false));
        document
          .querySelectorAll(".option-card")
          .forEach((card) => card.classList.remove("selected"));
        document.getElementById("mesuresRobeEdit").style.display = "none";
        document.getElementById("mesuresJupeEdit").style.display = "none";
      }

      // Mettre à jour l'image de preview
      const genderRadios = document.querySelectorAll(
        'input[name="genderPreviewEdit"]'
      );
      genderRadios.forEach((radio) => {
        if (radio.value === val) radio.checked = true;
      });

      document.getElementById("avatarEdit").src =
        val === "Femme"
          ? "assets/images/model4.jpg"
          : "assets/images/model3.jpg";
    });

    // Gestion des options femme
    document.querySelectorAll(".option-card").forEach((card) => {
      card.addEventListener("click", () => {
        document
          .querySelectorAll(".option-card")
          .forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");

        const radio = card.querySelector(".form-check-input");
        radio.checked = true;

        const option = card.getAttribute("data-option");
        document.getElementById("mesuresRobeEdit").style.display =
          option === "robe" ? "block" : "none";
        document.getElementById("mesuresJupeEdit").style.display =
          option === "jupe" ? "block" : "none";
      });
    });

    // Gestion des radios de preview
    document
      .querySelectorAll('input[name="genderPreviewEdit"]')
      .forEach((radio) => {
        radio.addEventListener("change", () => {
          document.getElementById("avatarEdit").src =
            radio.value === "Femme"
              ? "assets/images/model4.jpg"
              : "assets/images/model3.jpg";
        });
      });
  }

  // Appel initial pour configurer les écouteurs
  setupEditFormListeners();

  // Exportez la fonction pour qu'elle soit accessible depuis votre fichier principal
  window.openEditModal = openEditModal;
});