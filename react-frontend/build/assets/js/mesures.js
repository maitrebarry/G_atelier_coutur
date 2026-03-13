

// mesures.js - Code complet et corrigé
const MEDIA_BASE_URL = (window.Common && typeof window.Common.getMediaBaseUrl === 'function')
  ? window.Common.getMediaBaseUrl()
  : (window.APP_CONFIG && window.APP_CONFIG.MEDIA_BASE_URL)
    || (window.location.hostname === 'localhost' ? 'http://localhost:8081' : window.location.origin);

window.API_BASE_URL = MEDIA_BASE_URL;

class ModelManager {
  constructor() {
    this.models = [];
    this.selectedModel = null;
    this.currentCategory = 'all';
    this.atelierId = null;
    this.initialized = false;
    this.baseUrl = MEDIA_BASE_URL;
  }

  async init() {
    console.log('🚀 Initialisation ModelManager...');

    try {
      // Attendre les données utilisateur avec timeout
      const userData = await this.waitForUserData(8000);
      console.log('✅ Données utilisateur reçues:', userData);

      await this.loadAtelierId();
      console.log('✅ Atelier ID chargé:', this.atelierId);

      if (this.atelierId) {
        await this.loadModels();
      } else {
        console.warn('⚠️ Atelier ID non disponible - mode dégradé activé');
        this.showInfo('Mode dégradé: Sélectionnez manuellement un modèle');
      }

      this.setupEventListeners();
      this.initialized = true;
      console.log('✅ ModelManager initialisé avec succès');

    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation ModelManager:', error);
      // Mode dégradé - initialiser sans modèles
      this.setupEventListeners();
      this.showWarning('Mode dégradé: Fonctionnalités limitées - ' + error.message);
    }
  }

  waitForUserData(maxWaitTime = 8000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      console.log('⏳ Attente des données utilisateur...');

      const checkUserData = () => {
        const userData = this.getUserData();

        if (userData && (userData.atelierId || userData.id)) {
          console.log('✅ Données utilisateur trouvées');
          resolve(userData);
          return;
        }

        const elapsed = Date.now() - startTime;
        if (elapsed > maxWaitTime) {
          console.warn(`⏰ Timeout après ${elapsed}ms - Données utilisateur non disponibles`);
          reject(new Error('Données utilisateur non disponibles'));
          return;
        }

        setTimeout(checkUserData, 200);
      };

      checkUserData();
    });
  }

  getUserData() {
    // 1. Vérifier window.currentUser
    if (window.currentUser && typeof window.currentUser === 'object') {
      return window.currentUser;
    }

    // 2. Vérifier localStorage
    const storageKeys = ['userData', 'currentUser', 'user', 'atelierUser'];
    for (const key of storageKeys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn(`Erreur parsing ${key}:`, e);
      }
    }

    // 3. Vérifier sessionStorage
    for (const key of storageKeys) {
      try {
        const stored = sessionStorage.getItem(key);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn(`Erreur parsing sessionStorage.${key}:`, e);
      }
    }

    return null;
  }

  async loadAtelierId() {
    console.log('🔍 Chargement atelier ID...');
    const userData = this.getUserData();

    if (userData) {
      if (userData.atelierId) {
        this.atelierId = userData.atelierId;
        return;
      }
      if (userData.id && userData.role === 'ATELIER') {
        this.atelierId = userData.id;
        return;
      }
    }

    // Fallback methods
    this.atelierId = this.getAtelierIdFromFallback();
  }

  getAtelierIdFromFallback() {
    // 1. localStorage atelier data
    const atelierKeys = ['currentAtelier', 'atelier', 'selectedAtelier'];
    for (const key of atelierKeys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const data = JSON.parse(stored);
          if (data.id) return data.id;
        }
      } catch (e) {
        console.warn(`Erreur parsing ${key}:`, e);
      }
    }

    // 2. Hidden fields
    const hiddenFields = [
      'input[name="atelierId"]',
      '#atelierId',
      '[data-atelier-id]',
      '.atelier-id'
    ];

    for (const selector of hiddenFields) {
      const element = document.querySelector(selector);
      if (element && element.value) {
        return element.value;
      }
    }

    // 3. JWT token
    const token = this.getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.atelierId || payload.id;
      } catch (e) {
        console.warn('Erreur décodage token:', e);
      }
    }

    return null;
  }

  getAuthToken() {
    return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  }

  async loadModels() {
    try {
      if (!this.atelierId) {
        throw new Error('Atelier ID non disponible');
      }

      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      console.log('📡 Chargement modèles pour atelier:', this.atelierId);

      const response = await fetch(`${this.baseUrl}/api/clients/modeles/atelier/${this.atelierId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      this.models = await response.json();
      console.log(`✅ ${this.models.length} modèles chargés`);
      this.renderModels();

    } catch (error) {
      console.error('❌ Erreur chargement modèles:', error);
      this.models = [];
      this.renderModels();
      this.showError('Impossible de charger les modèles: ' + error.message);
    }
  }

  getImageUrl(photoPath) {
    if (!photoPath) return 'assets/images/default-model.png';

    if (photoPath.startsWith('http')) {
      return photoPath;
    }

    return `${this.baseUrl}/model_photo/${photoPath}`;
  }

  renderModels() {
    const grid = document.getElementById('modelsGrid');
    if (!grid) {
      console.error('❌ Élément modelsGrid non trouvé');
      return;
    }

    if (this.models.length === 0) {
      grid.innerHTML = `
                <div class="col-12 text-center py-4">
                    <div class="text-muted">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <p>Aucun modèle disponible</p>
                    </div>
                </div>
            `;
      return;
    }

    const filteredModels = this.currentCategory === 'all'
      ? this.models
      : this.models.filter(model => model.categorie === this.currentCategory);

    if (filteredModels.length === 0) {
      grid.innerHTML = `
                <div class="col-12 text-center py-3">
                    <div class="text-warning">
                        Aucun modèle dans cette catégorie
                    </div>
                </div>
            `;
      return;
    }

    grid.innerHTML = '';
    filteredModels.forEach(model => {
      const modelCard = this.createModelCard(model);
      grid.appendChild(modelCard);
    });
  }

  createModelCard(model) {
    const card = document.createElement('div');
    card.className = `col-md-3 col-sm-6 mb-3 model-card ${this.selectedModel?.id === model.id ? 'selected' : ''}`;

    const imageUrl = this.getImageUrl(model.photoPath);

    card.innerHTML = `
            <div class="card h-100 model-card-inner">
                <img src="${imageUrl}" 
                     alt="${model.nom}" 
                     class="card-img-top model-image"
                     onerror="this.src='assets/images/default-model.png'">
                <div class="card-body">
                    <h6 class="card-title model-name">${model.nom}</h6>
                    ${model.prix ? `<p class="card-text model-price"><strong>${model.prix} FCFA</strong></p>` : ''}
                    ${model.categorie ? `<small class="text-muted">${model.categorie}</small>` : ''}
                </div>
            </div>
        `;

    card.addEventListener('click', () => this.previewModel(model));
    return card;
  }

  previewModel(model) {
    try {
      this.selectedModel = model;

      const imageUrl = this.getImageUrl(model.photoPath);

      // Mettre à jour tous les éléments du modal
      const elements = {
        'modelPreviewImage': { type: 'src', value: imageUrl },
        'modelPreviewName': { type: 'textContent', value: model.nom },
        'modelPreviewDescription': { type: 'textContent', value: model.description || 'Modèle de l\'atelier' },
        'modelPreviewCategory': { type: 'textContent', value: model.categorie || 'Non spécifiée' },
        'modelPreviewPrice': { type: 'textContent', value: model.prix ? `${model.prix} FCFA` : 'Non spécifié' }
      };

      Object.entries(elements).forEach(([id, config]) => {
        const element = document.getElementById(id);
        if (element) {
          if (config.type === 'src') {
            element.src = config.value;
            element.onerror = () => element.src = 'assets/images/default-model.png';
          } else {
            element[config.type] = config.value;
          }
        }
      });

      // Afficher le modal
      const modalElement = document.getElementById('modelPreviewModal');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }

    } catch (error) {
      console.error('❌ Erreur affichage modèle:', error);
      this.showError('Erreur lors de l\'affichage du modèle');
    }
  }

  selectCurrentModel() {
    if (!this.selectedModel) {
      this.showError('Aucun modèle sélectionné');
      return;
    }

    // Mettre à jour l'avatar
    const avatar = document.getElementById('avatar');
    const imageUrl = this.getImageUrl(this.selectedModel.photoPath);
    avatar.src = imageUrl;
    avatar.onerror = () => avatar.src = 'assets/images/default-model.png';
    avatar.style.objectFit = "cover";

    // Mettre à jour les champs cachés
    document.getElementById('selectedModelId').value = this.selectedModel.id;
    document.getElementById('modeleNom').value = this.selectedModel.nom;
    document.getElementById('photoInput').value = '';

    this.updateModelSelection();

    // Fermer le modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modelPreviewModal'));
    if (modal) modal.hide();

    console.log('✅ Modèle sélectionné:', this.selectedModel.nom);
    this.showSuccess(`Modèle "${this.selectedModel.nom}" sélectionné`);
  }

  updateModelSelection() {
    document.querySelectorAll('.model-card').forEach(card => {
      card.classList.remove('selected');
    });

    if (this.selectedModel) {
      const selectedCard = Array.from(document.querySelectorAll('.model-card'))
        .find(card => {
          const modelName = card.querySelector('.model-name').textContent;
          return modelName === this.selectedModel.nom;
        });
      if (selectedCard) {
        selectedCard.classList.add('selected');
      }
    }
  }

  setupEventListeners() {
    // Filtre par catégorie
    const categorieSelect = document.getElementById('categorieModele');
    if (categorieSelect) {
      categorieSelect.addEventListener('change', (e) => {
        this.currentCategory = e.target.value;
        this.renderModels();
      });
    }

    // Bouton de sélection
    const selectBtn = document.getElementById('selectModelBtn');
    if (selectBtn) {
      selectBtn.addEventListener('click', () => this.selectCurrentModel());
    }

    // Réinitialisation lors du choix d'une photo
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
      photoInput.addEventListener('change', () => {
        this.selectedModel = null;
        document.getElementById('selectedModelId').value = '';
        document.getElementById('modeleNom').value = '';
        this.updateModelSelection();

        const sexe = document.getElementById('sexe')?.value;
        const avatar = document.getElementById('avatar');
        if (sexe === 'Homme') {
          avatar.src = 'assets/images/model3.jpg';
        } else {
          avatar.src = 'assets/images/model4.jpg';
        }
        avatar.style.objectFit = "contain";
      });
    }
  }

  showError(message) {
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: message,
      timer: 4000,
      showConfirmButton: false
    });
  }

  showSuccess(message) {
    Swal.fire({
      icon: 'success',
      title: 'Succès',
      text: message,
      timer: 3000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }

  showWarning(message) {
    Swal.fire({
      icon: 'warning',
      title: 'Attention',
      text: message,
      timer: 5000
    });
  }

  showInfo(message) {
    const grid = document.getElementById('modelsGrid');
    if (grid) {
      grid.innerHTML = `<div class="alert alert-info text-center">${message}</div>`;
    }
  }
}

// Initialisation globale
let modelManager;

document.addEventListener("DOMContentLoaded", async function () {
  console.log('🚀 Démarrage application...');

  try {
    modelManager = new ModelManager();
    await modelManager.init();
    console.log('✅ Application initialisée avec succès');
  } catch (error) {
    console.error('❌ Erreur initialisation:', error);
    Swal.fire({
      icon: 'warning',
      title: 'Application chargée',
      text: 'Fonctionnalités de base disponibles',
      timer: 3000
    });
  }

  // GESTION DU FORMULAIRE PRINCIPAL
  const photoInput = document.getElementById("photoInput");
  const avatar = document.getElementById("avatar");
  const sexe = document.getElementById("sexe");
  const femmeOptions = document.getElementById("femmeOptions");
  const mesuresRobe = document.getElementById("mesuresRobe");
  const mesuresJupe = document.getElementById("mesuresJupe");
  const mesuresHomme = document.getElementById("mesuresHomme");
  const form = document.getElementById("measurementForm");
  const optionCards = document.querySelectorAll(".option-card");
  const genderRadios = document.querySelectorAll('input[name="genderPreview"]');
  const defaultImage = avatar.src;

  // Éléments du modal de prix
  const priceModal = new bootstrap.Modal(document.getElementById('priceModal'));
  const modelPriceInput = document.getElementById('modelPrice');
  const modelDescriptionInput = document.getElementById('modelDescription');
  const habitPhotoModalInput = document.getElementById('habitPhotoModalInput');
  const confirmSaveBtn = document.getElementById('confirmSave');

  // Gestion de l'avatar
  avatar.addEventListener("click", () => photoInput.click());

  photoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        avatar.src = event.target.result;
        avatar.style.objectFit = "cover";
      };
      reader.readAsDataURL(file);
    }
  });

  // modal habit photo preview
  if (habitPhotoModalInput) {
    habitPhotoModalInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      const container = document.getElementById('habitPhotoModalPreviewContainer');
      const img = document.getElementById('habitPhotoModalPreview');
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          img.src = evt.target.result;
          container.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        container.style.display = 'none';
        img.src = '';
      }
    });
  }

  // Gestion du changement de sexe
  sexe.addEventListener("change", () => {
    const val = sexe.value;
    femmeOptions.style.display = "none";
    mesuresRobe.style.display = "none";
    mesuresJupe.style.display = "none";
    mesuresHomme.style.display = "none";

    if (val === "Femme") {
      femmeOptions.style.display = "block";
    } else if (val === "Homme") {
      mesuresHomme.style.display = "block";
    }
  });

  // Gestion des options femme
  optionCards.forEach((card) => {
    card.addEventListener("click", () => {
      optionCards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");

      const radio = card.querySelector(".form-check-input");
      radio.checked = true;

      const option = card.getAttribute("data-option");
      mesuresRobe.style.display = option === "robe" ? "block" : "none";
      mesuresJupe.style.display = option === "jupe" ? "block" : "none";
    });
  });

  // Gestion du preview de genre
  genderRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.value === "Femme") {
        avatar.src = "assets/images/model4.jpg";
      } else {
        avatar.src = "assets/images/model3.jpg";
      }
    });
  });

  // Validation du formulaire
  function validateForm() {
    const requiredFields = [
      { id: "nom_cl", label: "Nom" },
      { id: "prenom_cl", label: "Prénom" },
      { id: "contact_cl", label: "Contact" },
      { id: "email_cl", label: "Email" },
      { id: "sexe", label: "Sexe" },
    ];

    let errors = [];

    requiredFields.forEach((field) => {
      const el = document.getElementById(field.id);
      if (!el || !el.value.trim()) {
        errors.push(`Le champ ${field.label} est obligatoire.`);
      }
    });

    // Validation contact
    const contact = document.getElementById("contact_cl").value;
    if (contact && !/^\d{8}$/.test(contact)) {
      errors.push("Le contact doit contenir exactement 8 chiffres.");
    }

    // Validation type vêtement femme
    const sexeValue = document.getElementById("sexe").value;
    if (sexeValue === "Femme") {
      const typeSelected = document.querySelector('input[name="femme_type"]:checked');
      if (!typeSelected) {
        errors.push("Veuillez sélectionner un type de vêtement (Robe ou Jupe).");
      }
    }

    return errors;
  }

  // Validation du prix
  function validatePrice() {
    const price = modelPriceInput.value.trim();
    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      modelPriceInput.classList.add('is-invalid');
      return false;
    }
    modelPriceInput.classList.remove('is-invalid');

    // habit photo required
    if (!habitPhotoModalInput || habitPhotoModalInput.files.length === 0) {
      habitPhotoModalInput.classList.add('is-invalid');
      return false;
    } else {
      habitPhotoModalInput.classList.remove('is-invalid');
    }

    return true;
  }

  // Réinitialisation du modal
  function resetModal() {
    modelPriceInput.value = '';
    modelPriceInput.classList.remove('is-invalid');
    if (modelDescriptionInput) modelDescriptionInput.value = '';
    if (habitPhotoModalInput) {
      habitPhotoModalInput.value = '';
      habitPhotoModalInput.classList.remove('is-invalid');
      const cont = document.getElementById('habitPhotoModalPreviewContainer');
      if (cont) cont.style.display = 'none';
      const img = document.getElementById('habitPhotoModalPreview');
      if (img) img.src = '';
    }
  }

  // Soumission du formulaire
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Erreur de validation",
        html: errors.join("<br>"),
      });
      return;
    }

    resetModal();
    priceModal.show();
  });

  // Confirmation d'enregistrement
  confirmSaveBtn.addEventListener("click", function () {
    if (!validatePrice()) {
      Swal.fire({
        icon: "error",
        title: "Prix invalide",
        text: "Veuillez saisir un prix valide pour le modèle.",
      });
      return;
    }

    priceModal.hide();
    saveFormData();
  });

  // Validation en temps réel du prix
  modelPriceInput.addEventListener('input', function () {
    validatePrice();
  });

  // Sauvegarde des données
  function saveFormData() {
    const formData = new FormData();
    const addedFields = new Set();

    // Ajouter tous les champs du formulaire
    const formElements = form.elements;
    for (let element of formElements) {
      if (element.name && element.type !== 'file') {
        if (element.type === 'checkbox' || element.type === 'radio') {
          if (element.checked) {
            if (element.name === 'genderPreview' && addedFields.has('genderPreview')) {
              continue;
            }
            formData.append(element.name, element.value);
            addedFields.add(element.name);
          }
        } else {
          formData.append(element.name, element.value);
          addedFields.add(element.name);
        }
      }
    }

    // Ajouter les informations du modèle sélectionné
    const selectedModelId = document.getElementById('selectedModelId').value;
    const modeleNom = document.getElementById('modeleNom').value;

    // prix + description + habit photo venus du modal
    formData.append('modelPrice', modelPriceInput.value);
    if (modelDescriptionInput && modelDescriptionInput.value) {
      formData.append('modelDescription', modelDescriptionInput.value);
    }
    if (habitPhotoModalInput && habitPhotoModalInput.files[0]) {
      formData.append('habitPhoto', habitPhotoModalInput.files[0]);
    }

    if (selectedModelId) {
      formData.append("selectedModelId", selectedModelId);
    }
    if (modeleNom) {
      formData.append("modeleNom", modeleNom);
    }

    // Ajouter genderPreview une seule fois
    const selectedGender = document.querySelector('input[name="genderPreview"]:checked');
    if (selectedGender && !addedFields.has('genderPreview')) {
      formData.append("genderPreview", selectedGender.value);
    }

    // Ajouter le prix
    formData.append("prix", modelPriceInput.value);

    // Ajouter la photo
    if (photoInput.files.length > 0) {
      formData.append("photo", photoInput.files[0]);
    }

    // Log des données envoyées
    console.log("📤 Données envoyées:");
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Erreur d'authentification",
        text: "Veuillez vous reconnecter.",
      });
      return;
    }

    // Désactiver le bouton pendant l'envoi
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';

    // Envoi des données
    fetch(Common.buildApiUrl('clients/ajouter'), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: formData,
    })
      .then((response) => {
        console.log("📥 Réponse reçue - Status:", response.status);

        if (!response.ok) {
          return response.text().then(text => {
            let errorMessage = "Erreur serveur";
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              errorMessage = text || errorMessage;
            }
            throw new Error(errorMessage);
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log("✅ Succès - Données:", data);

        if (data.status === "success") {
          Swal.fire({
            icon: "success",
            title: "Succès",
            text: data.message,
            timer: 2500,
            timerProgressBar: true,
            showConfirmButton: false,
          });

          // Réinitialisation du formulaire
          form.reset();
          avatar.src = defaultImage;
          avatar.style.objectFit = "contain";

          // Réinitialisation de l'affichage
          femmeOptions.style.display = "none";
          mesuresRobe.style.display = "none";
          mesuresJupe.style.display = "none";
          mesuresHomme.style.display = "none";
          optionCards.forEach((c) => c.classList.remove("selected"));
          document.getElementById('previewFemale').checked = true;

          // Rechargement de la liste des clients si disponible
          if (typeof window.fetchClients === 'function') {
            setTimeout(() => window.fetchClients(), 1000);
          }
        } else {
          Swal.fire({
            icon: "error",
            title: "Erreur",
            text: data.message || "Une erreur est survenue.",
          });
        }
      })
      .catch((err) => {
        console.error("💥 Erreur complète:", err);
        Swal.fire({
          icon: "error",
          title: "Erreur",
          text: err.message || "Impossible de contacter le serveur.",
        });
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      });
  }
});