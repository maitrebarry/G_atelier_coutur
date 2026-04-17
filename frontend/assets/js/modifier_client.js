

document.addEventListener("DOMContentLoaded", () => {
  const editModal = new bootstrap.Modal(document.getElementById("editModal"));
  const saveBtn = document.getElementById("saveEditBtn");
  const selectMesure = document.getElementById("clientMesuresSelect");
  const addModeleBtn = document.getElementById("addModeleBtn");
  const deleteModeleBtn = document.getElementById("deleteModeleBtn");
  const photoInput = document.getElementById("photoEditInput");
  const habitPhotoInput = document.getElementById("habitPhotoEditInput");

  let currentClientId = null;
  let currentClient = null;
  let currentMesures = [];
  let currentMesureId = null;
  let creatingMode = false;

  saveBtn.addEventListener("click", saveClientChanges);
  addModeleBtn.addEventListener("click", startNewMeasureMode);
  deleteModeleBtn.addEventListener("click", deleteCurrentMeasure);
  selectMesure.addEventListener("change", () => selectMeasure(selectMesure.value));

  photoInput.addEventListener("change", previewMainPhoto);
  habitPhotoInput.addEventListener("change", updateHabitPhotoInfoFromFile);

  document.getElementById("editSexe").addEventListener("change", () => {
    const sexe = document.getElementById("editSexe").value;
    toggleMeasurementSections(sexe, null);
    updateDefaultPreview(sexe);
  });

  document.querySelectorAll(".option-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".option-card").forEach((item) => item.classList.remove("selected"));
      card.classList.add("selected");
      const radio = card.querySelector(".form-check-input");
      radio.checked = true;
      const option = card.getAttribute("data-option");
      document.getElementById("mesuresRobeEdit").style.display = option === "robe" ? "block" : "none";
      document.getElementById("mesuresJupeEdit").style.display = option === "jupe" ? "block" : "none";
    });
  });

  document.querySelectorAll('input[name="genderPreviewEdit"]').forEach((radio) => {
    radio.addEventListener("change", () => updateDefaultPreview(radio.value));
  });

  function getToken() {
    return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  }

  function getAuthHeaders() {
    const token = getToken();
    if (!token) {
      throw new Error("Token non disponible. Veuillez vous reconnecter.");
    }
    return { Authorization: `Bearer ${token}` };
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const fallback = await response.text().catch(() => "");
      throw new Error(errorData?.message || fallback || `Erreur HTTP ${response.status}`);
    }
    if (response.status === 204) {
      return null;
    }
    return response.json();
  }

  async function openEditModal(clientId) {
    try {
      currentClientId = clientId;
      currentClient = await fetchJson(`http://localhost:8081/api/clients/${clientId}`, {
        headers: {
          Accept: "application/json",
          ...getAuthHeaders(),
        },
      });

      fillClientFields(currentClient);
      currentMesures = Array.isArray(currentClient.mesures) ? currentClient.mesures : [];
      renderMesuresList();

      if (currentMesures.length > 0) {
        selectMeasure(currentMesures[0].id);
      } else {
        startNewMeasureMode();
      }

      editModal.show();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: error.message || "Impossible de charger les données du client",
      });
    }
  }

  function fillClientFields(client) {
    document.getElementById("editClientId").value = client.id || "";
    document.getElementById("editNom").value = client.nom || "";
    document.getElementById("editPrenom").value = client.prenom || "";
    document.getElementById("editContact").value = client.contact || "";
    document.getElementById("editAdresse").value = client.adresse || "";
    document.getElementById("editEmail").value = client.email || "";
  }

  function renderMesuresList() {
    selectMesure.innerHTML = "";

    if (currentMesures.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Aucun modèle enregistré";
      selectMesure.appendChild(option);
      deleteModeleBtn.disabled = true;
      return;
    }

    currentMesures.forEach((mesure, index) => {
      const option = document.createElement("option");
      option.value = mesure.id;
      option.textContent = buildMeasureLabel(mesure, index);
      selectMesure.appendChild(option);
    });

    deleteModeleBtn.disabled = false;
  }

  function buildMeasureLabel(mesure, index) {
    const base = mesure.modeleNom || mesure.typeVetement || `Modèle ${index + 1}`;
    const prix = mesure.prix ? ` - ${mesure.prix} FCFA` : "";
    return `${base}${prix}`;
  }

  function selectMeasure(mesureId) {
    const mesure = currentMesures.find((item) => item.id === mesureId);
    if (!mesure) {
      startNewMeasureMode();
      return;
    }

    creatingMode = false;
    currentMesureId = mesure.id;
    document.getElementById("editSelectedMesureId").value = mesure.id;
    selectMesure.value = mesure.id;
    fillMeasureForm(mesure);
    deleteModeleBtn.disabled = false;
  }

  function fillMeasureForm(mesure) {
    const sexe = mesure.sexe || "Femme";
    document.getElementById("editSexe").value = sexe;
    document.getElementById("editPrix").value = mesure.prix ?? "";
    document.getElementById("editModeleNom").value = mesure.modeleNom || "";
    document.getElementById("editDescription").value = mesure.description || "";
    document.getElementById("existingPhoto").value = normalizeStoragePath(mesure.photoPath);
    document.getElementById("existingHabitPhoto").value = normalizeStoragePath(mesure.habitPhotoPath);
    photoInput.value = "";
    habitPhotoInput.value = "";

    toggleMeasurementSections(sexe, mesure.typeVetement);
    syncGenderPreview(sexe);
    fillMeasurements(mesure);
    setPreviewImage(mesure.photoPath, sexe);
    updateHabitPhotoInfo(mesure.habitPhotoPath);
  }

  function startNewMeasureMode() {
    creatingMode = true;
    currentMesureId = null;
    document.getElementById("editSelectedMesureId").value = "";
    selectMesure.value = "";
    deleteModeleBtn.disabled = currentMesures.length === 0;
    resetMeasureFields();
  }

  function resetMeasureFields() {
    document.getElementById("editModeleNom").value = "";
    document.getElementById("editDescription").value = "";
    document.getElementById("editPrix").value = "";
    document.getElementById("existingPhoto").value = "";
    document.getElementById("existingHabitPhoto").value = "";
    photoInput.value = "";
    habitPhotoInput.value = "";

    [
      "robe_epaule_edit", "robe_manche_edit", "robe_poitrine_edit", "robe_taille_edit", "robe_longueur_edit", "robe_fesse_edit",
      "robe_tour_manche_edit", "robe_longueur_poitrine_edit", "robe_longueur_taille_edit", "robe_longueur_fesse_edit",
      "jupe_epaule_edit", "jupe_manche_edit", "jupe_poitrine_edit", "jupe_taille_edit", "jupe_longueur_edit", "jupe_longueur_jupe_edit",
      "jupe_ceinture_edit", "jupe_fesse_edit", "jupe_tour_manche_edit", "jupe_longueur_poitrine_edit", "jupe_longueur_taille_edit", "jupe_longueur_fesse_edit",
      "homme_epaule_edit", "homme_manche_edit", "homme_longueur_edit", "homme_longueur_pantalon_edit", "homme_ceinture_edit", "homme_cuisse_edit",
      "homme_poitrine_edit", "homme_corps_edit", "homme_tour_manche_edit"
    ].forEach((id) => {
      const field = document.getElementById(id);
      if (field) {
        field.value = "";
      }
    });

    const sexe = document.getElementById("editSexe").value || "Femme";
    toggleMeasurementSections(sexe, sexe === "Homme" ? "homme" : null);
    syncGenderPreview(sexe);
    updateDefaultPreview(sexe);
    updateHabitPhotoInfo(null);
  }

  function normalizeStoragePath(path) {
    if (!path) {
      return "";
    }
    return path.replace(/^\/+/, "").replace("model_photo/", "").replace("habit_photo/", "");
  }

  function setPreviewImage(photoPath, sexe) {
    const avatar = document.getElementById("avatarEdit");
    const normalized = normalizeStoragePath(photoPath);
    if (normalized) {
      avatar.src = `http://localhost:8081/model_photo/${normalized}`;
    } else {
      updateDefaultPreview(sexe);
    }
    avatar.style.objectFit = "cover";
  }

  function updateDefaultPreview(sexe) {
    document.getElementById("avatarEdit").src =
      sexe === "Homme" ? "assets/images/model3.jpg" : "assets/images/model4.jpg";
  }

  function syncGenderPreview(sexe) {
    document.querySelectorAll('input[name="genderPreviewEdit"]').forEach((radio) => {
      radio.checked = radio.value === sexe;
    });
  }

  function previewMainPhoto(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      Swal.fire({ icon: "error", title: "Type invalide", text: "Veuillez sélectionner une image." });
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      document.getElementById("avatarEdit").src = loadEvent.target.result;
      document.getElementById("existingPhoto").value = "";
    };
    reader.readAsDataURL(file);
  }

  function updateHabitPhotoInfo(path) {
    const info = document.getElementById("habitPhotoInfo");
    const normalized = normalizeStoragePath(path);
    info.textContent = normalized ? `Photo enregistrée: ${normalized}` : "Aucune photo d'habit enregistrée";
  }

  function updateHabitPhotoInfoFromFile(event) {
    const file = event.target.files[0];
    const info = document.getElementById("habitPhotoInfo");
    if (file) {
      info.textContent = `Nouveau fichier sélectionné: ${file.name}`;
      document.getElementById("existingHabitPhoto").value = "";
    } else {
      updateHabitPhotoInfo(document.getElementById("existingHabitPhoto").value);
    }
  }

  function toggleMeasurementSections(sexe, typeVetement) {
    document.getElementById("femmeOptionsEdit").style.display = sexe === "Femme" ? "block" : "none";
    document.getElementById("mesuresRobeEdit").style.display = "none";
    document.getElementById("mesuresJupeEdit").style.display = "none";
    document.getElementById("mesuresHommeEdit").style.display = sexe === "Homme" ? "block" : "none";

    document.querySelectorAll('input[name="femme_type_edit"]').forEach((radio) => {
      radio.checked = false;
    });
    document.querySelectorAll(".option-card").forEach((card) => card.classList.remove("selected"));

    if (sexe === "Femme") {
      if (typeVetement === "robe") {
        document.getElementById("femme_type_robe_edit").checked = true;
        document.querySelector('.option-card[data-option="robe"]')?.classList.add("selected");
        document.getElementById("mesuresRobeEdit").style.display = "block";
      } else if (typeVetement === "jupe") {
        document.getElementById("femme_type_jupe_edit").checked = true;
        document.querySelector('.option-card[data-option="jupe"]')?.classList.add("selected");
        document.getElementById("mesuresJupeEdit").style.display = "block";
      }
    }
  }

  function fillMeasurements(mesure) {
    const setValue = (id, value) => {
      const field = document.getElementById(id);
      if (field) {
        field.value = value ?? "";
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

  function buildClientInfoFormData() {
    const formData = new FormData();
    formData.append("nom", document.getElementById("editNom").value.trim());
    formData.append("prenom", document.getElementById("editPrenom").value.trim());
    formData.append("contact", document.getElementById("editContact").value.trim());
    formData.append("adresse", document.getElementById("editAdresse").value.trim());
    formData.append("email", document.getElementById("editEmail").value.trim());
    return formData;
  }

  function buildMesureFormData() {
    const formData = new FormData();
    const sexe = document.getElementById("editSexe").value;
    const typeVetement = sexe === "Femme"
      ? document.querySelector('input[name="femme_type_edit"]:checked')?.value || ""
      : "homme";

    formData.append("modeleNom", document.getElementById("editModeleNom").value.trim());
    formData.append("description", document.getElementById("editDescription").value.trim());
    formData.append("sexe", sexe);
    formData.append("typeVetement", typeVetement);
    formData.append("prix", document.getElementById("editPrix").value.trim());

    if (photoInput.files[0]) {
      formData.append("photo", photoInput.files[0]);
    }
    if (habitPhotoInput.files[0]) {
      formData.append("habitPhoto", habitPhotoInput.files[0]);
    }

    addMeasurementsToFormData(formData, sexe, typeVetement);
    return formData;
  }

  function addMeasurementsToFormData(formData, sexe, typeVetement) {
    if (sexe === "Femme" && typeVetement === "robe") {
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
    } else if (sexe === "Femme" && typeVetement === "jupe") {
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
    [
      ["editNom", "Nom"],
      ["editPrenom", "Prénom"],
      ["editContact", "Contact"],
      ["editSexe", "Sexe"],
      ["editPrix", "Prix"],
    ].forEach(([id, label]) => {
      const value = document.getElementById(id)?.value?.trim();
      if (!value) {
        errors.push(`Le champ ${label} est obligatoire.`);
      }
    });

    if (!document.getElementById("editModeleNom").value.trim()) {
      errors.push("Le nom du modèle est obligatoire.");
    }

    const prix = parseFloat(document.getElementById("editPrix").value);
    if (Number.isNaN(prix) || prix <= 0) {
      errors.push("Le prix doit être un nombre supérieur à 0.");
    }

    const sexe = document.getElementById("editSexe").value;
    if (sexe === "Femme") {
      const typeVetement = document.querySelector('input[name="femme_type_edit"]:checked')?.value;
      if (!typeVetement) {
        errors.push("Veuillez sélectionner un type de vêtement.");
      }
    }

    return errors;
  }

  async function saveClientChanges() {
    const errors = validateEditForm();
    if (errors.length > 0) {
      Swal.fire({ icon: "error", title: "Erreur de validation", html: errors.join("<br>") });
      return;
    }

    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';

    try {
      await fetchJson(`http://localhost:8081/api/clients/${currentClientId}/infos`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
        },
        body: buildClientInfoFormData(),
      });

      const mesureFormData = buildMesureFormData();
      const url = creatingMode || !currentMesureId
        ? `http://localhost:8081/api/clients/${currentClientId}/mesures`
        : `http://localhost:8081/api/clients/${currentClientId}/mesures/${currentMesureId}`;
      const method = creatingMode || !currentMesureId ? "POST" : "PUT";

      await fetchJson(url, {
        method,
        headers: {
          ...getAuthHeaders(),
        },
        body: mesureFormData,
      });

      await Swal.fire({
        icon: "success",
        title: "Succès",
        text: creatingMode ? "Nouveau modèle ajouté avec succès" : "Modèle mis à jour avec succès",
        timer: 1800,
        showConfirmButton: false,
      });

      editModal.hide();
      window.location.reload();
    } catch (error) {
      Swal.fire({ icon: "error", title: "Erreur", text: error.message || "Échec de l'enregistrement" });
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  }

  async function deleteCurrentMeasure() {
    if (!currentMesureId) {
      Swal.fire({ icon: "info", title: "Aucun modèle sélectionné", text: "Sélectionnez d'abord un modèle à supprimer." });
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Supprimer ce modèle ?",
      text: "Cette action retirera uniquement ce modèle du client.",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#d33",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await fetchJson(`http://localhost:8081/api/clients/${currentClientId}/mesures/${currentMesureId}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeaders(),
          Accept: "application/json",
        },
      });

      currentMesures = currentMesures.filter((mesure) => mesure.id !== currentMesureId);
      renderMesuresList();
      if (currentMesures.length > 0) {
        selectMeasure(currentMesures[0].id);
      } else {
        startNewMeasureMode();
      }

      Swal.fire({ icon: "success", title: "Supprimé", text: "Le modèle a été supprimé." });
    } catch (error) {
      Swal.fire({ icon: "error", title: "Erreur", text: error.message || "Impossible de supprimer le modèle." });
    }
  }

  window.openEditModal = openEditModal;
});