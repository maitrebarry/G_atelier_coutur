

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
      console.log("📝 Ouverture modal modification pour client:", clientId);
      currentClientId = clientId;
      
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

      if (!token) {
        throw new Error("Token non disponible. Veuillez vous reconnecter.");
      }

      const response = await fetch(
        `http://localhost:8081/api/clients/${clientId}`,
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }

      const client = await response.json();
      console.log("✅ Données client reçues:", client);

      if (!client.mesures || client.mesures.length === 0) {
        throw new Error("Aucune mesure trouvée pour ce client");
      }

      const mesure = client.mesures[0];
      console.log("📏 Mesure trouvée:", mesure);

      // Remplir le formulaire avec les données existantes
      fillEditForm(client, mesure);

      // Afficher le modal
      editModal.show();
      
    } catch (error) {
      console.error("❌ Erreur lors du chargement du client:", error);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: error.message || "Impossible de charger les données du client",
      });
    }
  }

  function fillEditForm(client, mesure) {
    console.log("🔄 Remplissage du formulaire avec:", { client, mesure });

    try {
      // Remplir les champs généraux
      document.getElementById("editNom").value = client.nom || "";
      document.getElementById("editPrenom").value = client.prenom || "";
      document.getElementById("editContact").value = client.contact || "";
      document.getElementById("editAdresse").value = client.adresse || "";
      document.getElementById("editEmail").value = client.email || "";
      // ✅ CORRECTION : Assurer que le sexe est bien défini
      const sexe = mesure.sexe || client.sexe || "Femme";
      document.getElementById("editSexe").value = sexe;
      // ✅ NOUVEAU : Remplir le prix
      const prix = mesure.prix || 0;
      document.getElementById("editPrix").value = prix;
      console.log("💰 Prix défini:", prix + " FCFA");
      // Gestion de la photo
      const avatarEdit = document.getElementById("avatarEdit");
      const existingPhotoInput = document.getElementById("existingPhoto");

      // 1. Photo par défaut selon le sexe
      let photoUrl = sexe.toLowerCase() === "homme" 
        ? "assets/images/model3.jpg" 
        : "assets/images/model4.jpg";

      // 2. Si une photo existe dans les mesures, l'utiliser
      if (mesure.photoPath) {
        // Nettoyer le chemin
        const cleanPath = mesure.photoPath
          .replace(/^\/+/, "")
          .replace("model_photo/", "");

        photoUrl = `http://localhost:8081/model_photo/${cleanPath}`;

        // Stocker le chemin original pour la soumission
        if (existingPhotoInput) {
          existingPhotoInput.value = cleanPath;
        }
      }

      console.log("🖼️ URL photo finale:", photoUrl);
      avatarEdit.src = photoUrl;
      avatarEdit.style.objectFit = "cover";

      // Gestion des erreurs de chargement
      avatarEdit.onerror = function () {
        console.error("❌ Erreur de chargement de la photo, utilisation par défaut");
        this.src = sexe.toLowerCase() === "homme" 
          ? "assets/images/model3.jpg" 
          : "assets/images/model4.jpg";
        if (existingPhotoInput) {
          existingPhotoInput.value = "";
        }
      };

      // ✅ CORRECTION : Gérer le genre dans le preview
      const genderRadios = document.querySelectorAll('input[name="genderPreviewEdit"]');
      genderRadios.forEach(radio => {
        radio.checked = (radio.value === sexe);
      });

      // Afficher les sections appropriées
      toggleMeasurementSections(sexe, mesure.typeVetement);

      // Remplir les mesures
      fillMeasurements(mesure);
      
    } catch (error) {
      console.error("❌ Erreur lors du remplissage du formulaire:", error);
      throw error;
    }
  }

  // Fonction pour gérer l'upload de nouvelle photo
  document.getElementById("photoEditInput").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      // ✅ Vérification du type de fichier
      if (!file.type.startsWith('image/')) {
        Swal.fire({
          icon: 'error',
          title: 'Type de fichier invalide',
          text: 'Veuillez sélectionner une image'
        });
        this.value = ''; // Réinitialiser l'input
        return;
      }

      // ✅ Vérification de la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'Fichier trop volumineux',
          text: 'La taille maximale est de 5MB'
        });
        this.value = ''; // Réinitialiser l'input
        return;
      }

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
      reader.onerror = function () {
        Swal.fire({
          icon: 'error',
          title: 'Erreur de lecture',
          text: 'Impossible de lire le fichier'
        });
        this.value = ''; // Réinitialiser l'input
      };
      reader.readAsDataURL(file);
    }
  });

  function toggleMeasurementSections(sexe, typeVetement) {
    console.log("📋 Affichage sections pour:", sexe, typeVetement);
    
    // Cacher toutes les sections d'abord
    document.getElementById("femmeOptionsEdit").style.display = "none";
    document.getElementById("mesuresRobeEdit").style.display = "none";
    document.getElementById("mesuresJupeEdit").style.display = "none";
    document.getElementById("mesuresHommeEdit").style.display = "none";

    // ✅ CORRECTION : Réinitialiser les sélections
    document.querySelectorAll('input[name="femme_type_edit"]').forEach(radio => {
      radio.checked = false;
    });
    document.querySelectorAll(".option-card").forEach(card => {
      card.classList.remove("selected");
    });

    if (sexe === "Femme") {
      document.getElementById("femmeOptionsEdit").style.display = "block";

      // Sélectionner l'option appropriée
      if (typeVetement === "robe") {
        document.getElementById("femme_type_robe_edit").checked = true;
        const robeCard = document.querySelector('.option-card[data-option="robe"]');
        if (robeCard) robeCard.classList.add("selected");
        document.getElementById("mesuresRobeEdit").style.display = "block";
      } else if (typeVetement === "jupe") {
        document.getElementById("femme_type_jupe_edit").checked = true;
        const jupeCard = document.querySelector('.option-card[data-option="jupe"]');
        if (jupeCard) jupeCard.classList.add("selected");
        document.getElementById("mesuresJupeEdit").style.display = "block";
      }
    } else if (sexe === "Homme") {
      document.getElementById("mesuresHommeEdit").style.display = "block";
    }
  }

  function fillMeasurements(mesure) {
    console.log("📐 Remplissage des mesures:", mesure);
    
    // ✅ CORRECTION : Fonction utilitaire pour remplir un champ
    const setValue = (elementId, value) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.value = value !== null && value !== undefined ? value : "";
      } else {
        console.warn(`❌ Élément non trouvé: ${elementId}`);
      }
    };

    if (mesure.sexe === "Femme") {
      if (mesure.typeVetement === "robe") {
        setValue("robe_epaule_edit", mesure.epaule);
        setValue("robe_manche_edit", mesure.manche);
        setValue("robe_poitrine_edit", mesure.poitrine);
        setValue("robe_taille_edit", mesure.taille);
        setValue("robe_longueur_edit", mesure.longueur);
        setValue("robe_fesse_edit", mesure.fesse);
        setValue("robe_tour_manche_edit", mesure.tourManche);
        setValue("robe_longueur_poitrine_edit", mesure.longueurPoitrine);
        setValue("robe_longueur_taille_edit", mesure.longueurTaille);
        setValue("robe_longueur_fesse_edit", mesure.longueurFesse);
      } else if (mesure.typeVetement === "jupe") {
        setValue("jupe_epaule_edit", mesure.epaule);
        setValue("jupe_manche_edit", mesure.manche);
        setValue("jupe_poitrine_edit", mesure.poitrine);
        setValue("jupe_taille_edit", mesure.taille);
        setValue("jupe_longueur_edit", mesure.longueur);
        setValue("jupe_longueur_jupe_edit", mesure.longueurJupe);
        setValue("jupe_ceinture_edit", mesure.ceinture);
        setValue("jupe_fesse_edit", mesure.fesse);
        setValue("jupe_tour_manche_edit", mesure.tourManche);
        setValue("jupe_longueur_poitrine_edit", mesure.longueurPoitrine);
        setValue("jupe_longueur_taille_edit", mesure.longueurTaille);
        setValue("jupe_longueur_fesse_edit", mesure.longueurFesse);
      }
    } else if (mesure.sexe === "Homme") {
      setValue("homme_epaule_edit", mesure.epaule);
      setValue("homme_manche_edit", mesure.manche);
      setValue("homme_longueur_edit", mesure.longueur);
      setValue("homme_longueur_pantalon_edit", mesure.longueurPantalon);
      setValue("homme_ceinture_edit", mesure.ceinture);
      setValue("homme_cuisse_edit", mesure.cuisse);
      setValue("homme_poitrine_edit", mesure.poitrine);
      setValue("homme_corps_edit", mesure.corps);
      setValue("homme_tour_manche_edit", mesure.tourManche);
    }
  }

  async function saveClientChanges() {
    console.log("💾 Sauvegarde des modifications pour client:", currentClientId);
    
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

    try {
      // Préparation des données
      const formData = new FormData();
      
      // ✅ CORRECTION : Ajouter tous les champs nécessaires
      formData.append("nom", document.getElementById("editNom").value);
      formData.append("prenom", document.getElementById("editPrenom").value);
      formData.append("contact", document.getElementById("editContact").value);
      formData.append("adresse", document.getElementById("editAdresse").value);
      formData.append("email", document.getElementById("editEmail").value);
      formData.append("sexe", document.getElementById("editSexe").value);
       // ✅ NOUVEAU : Ajouter le prix
      const prix = document.getElementById("editPrix").value;
      formData.append("prix", prix);
      console.log("💰 Prix envoyé:", prix + " FCFA");
      // ✅ CORRECTION : Ajouter genderPreview
      const selectedGender = document.querySelector('input[name="genderPreviewEdit"]:checked');
      if (selectedGender) {
        formData.append("genderPreview", selectedGender.value);
      }

      // Gestion du type de vêtement
      const sexe = document.getElementById("editSexe").value;
      if (sexe === "Femme") {
        const typeVetement = document.querySelector('input[name="femme_type_edit"]:checked')?.value;
        if (typeVetement) {
          formData.append("femme_type_edit", typeVetement);
          console.log("✅ Type vêtement femme envoyé:", typeVetement);
        } else {
          throw new Error("Veuillez sélectionner un type de vêtement pour une femme");
        }
      }

      // Gestion de la photo
      const photoInput = document.getElementById("photoEditInput");
      if (photoInput.files[0]) {
        formData.append("photo", photoInput.files[0]);
        console.log("✅ Nouvelle photo envoyée");
      } else {
        const existingPhoto = document.getElementById("existingPhoto").value;
        if (existingPhoto) {
          formData.append("existing_photo", existingPhoto);
          console.log("✅ Photo existante conservée:", existingPhoto);
        }
      }

      // Ajouter les mesures selon le type
      addMeasurementsToFormData(formData, sexe);

      // ✅ CORRECTION : Log des données envoyées
      console.log("📤 Données envoyées pour modification:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

      if (!token) {
        throw new Error("Token non disponible. Veuillez vous reconnecter.");
      }

      // ✅ CORRECTION : Ajouter un loader
      const saveBtn = document.getElementById("saveEditBtn");
      const originalText = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';

      const response = await fetch(
        `http://localhost:8081/api/clients/${currentClientId}`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Erreur inconnue" }));
        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Réponse serveur:", result);

      Swal.fire({
        icon: "success",
        title: "Succès",
        text: result.message || "Modifications enregistrées avec succès",
        timer: 2500,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      editModal.hide();
      
      // ✅ CORRECTION : Recharger les données
      setTimeout(() => {
        if (typeof fetchClients === 'function') {
          fetchClients();
        } else {
          location.reload();
        }
      }, 1000);
      
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: error.message || "Échec de la modification",
      });
    } finally {
      // ✅ CORRECTION : Réactiver le bouton
      const saveBtn = document.getElementById("saveEditBtn");
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Enregistrer';
      }
    }
  }

  // ✅ CORRECTION : Fonction pour ajouter les mesures au FormData
  function addMeasurementsToFormData(formData, sexe) {
    console.log("➕ Ajout des mesures au FormData pour sexe:", sexe);
    
    if (sexe === "Femme") {
      const typeVetement = document.querySelector('input[name="femme_type_edit"]:checked')?.value;
      console.log("Type vêtement femme:", typeVetement);
      
      if (typeVetement === "robe") {
        formData.append("robe_epaule", document.getElementById("robe_epaule_edit").value || "");
        formData.append("robe_manche", document.getElementById("robe_manche_edit").value || "");
        formData.append("robe_poitrine", document.getElementById("robe_poitrine_edit").value || "");
        formData.append("robe_taille", document.getElementById("robe_taille_edit").value || "");
        formData.append("robe_longueur", document.getElementById("robe_longueur_edit").value || "");
        formData.append("robe_fesse", document.getElementById("robe_fesse_edit").value || "");
        formData.append("robe_tour_manche", document.getElementById("robe_tour_manche_edit").value || "");
        formData.append("robe_longueur_poitrine", document.getElementById("robe_longueur_poitrine_edit").value || "");
        formData.append("robe_longueur_taille", document.getElementById("robe_longueur_taille_edit").value || "");
        formData.append("robe_longueur_fesse", document.getElementById("robe_longueur_fesse_edit").value || "");
      } else if (typeVetement === "jupe") {
        formData.append("jupe_epaule", document.getElementById("jupe_epaule_edit").value || "");
        formData.append("jupe_manche", document.getElementById("jupe_manche_edit").value || "");
        formData.append("jupe_poitrine", document.getElementById("jupe_poitrine_edit").value || "");
        formData.append("jupe_taille", document.getElementById("jupe_taille_edit").value || "");
        formData.append("jupe_longueur", document.getElementById("jupe_longueur_edit").value || "");
        formData.append("jupe_longueur_jupe", document.getElementById("jupe_longueur_jupe_edit").value || "");
        formData.append("jupe_ceinture", document.getElementById("jupe_ceinture_edit").value || "");
        formData.append("jupe_fesse", document.getElementById("jupe_fesse_edit").value || "");
        formData.append("jupe_tour_manche", document.getElementById("jupe_tour_manche_edit").value || "");
        formData.append("jupe_longueur_poitrine", document.getElementById("jupe_longueur_poitrine_edit").value || "");
        formData.append("jupe_longueur_taille", document.getElementById("jupe_longueur_taille_edit").value || "");
        formData.append("jupe_longueur_fesse", document.getElementById("jupe_longueur_fesse_edit").value || "");
      }
    } else if (sexe === "Homme") {
      formData.append("homme_epaule", document.getElementById("homme_epaule_edit").value || "");
      formData.append("homme_manche", document.getElementById("homme_manche_edit").value || "");
      formData.append("homme_longueur", document.getElementById("homme_longueur_edit").value || "");
      formData.append("homme_longueur_pantalon", document.getElementById("homme_longueur_pantalon_edit").value || "");
      formData.append("homme_ceinture", document.getElementById("homme_ceinture_edit").value || "");
      formData.append("homme_cuisse", document.getElementById("homme_cuisse_edit").value || "");
      formData.append("homme_poitrine", document.getElementById("homme_poitrine_edit").value || "");
      formData.append("homme_corps", document.getElementById("homme_corps_edit").value || "");
      formData.append("homme_tour_manche", document.getElementById("homme_tour_manche_edit").value || "");
    }
  }

  function validateEditForm() {
    const errors = [];
    const requiredFields = [
      { id: "editNom", label: "Nom" },
      { id: "editPrenom", label: "Prénom" },
      { id: "editContact", label: "Contact" },
      { id: "editEmail", label: "Email" },
      { id: "editSexe", label: "Sexe" },
      { id: "editPrix", label: "Prix" },
    ];

    requiredFields.forEach((field) => {
      const el = document.getElementById(field.id);
      if (!el || !el.value.trim()) {
        errors.push(`Le champ ${field.label} est obligatoire.`);
      }
    });
     // ✅ NOUVEAU : Validation spécifique du prix
    const prixInput = document.getElementById("editPrix");
    if (prixInput && prixInput.value) {
      const prix = parseFloat(prixInput.value);
      if (isNaN(prix) || prix <= 0) {
        errors.push("Le prix doit être un nombre supérieur à 0.");
      }
    }
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
  // Exportez la fonction pour qu'elle soit accessible depuis votre fichier principal
  window.openEditModal = openEditModal;
});