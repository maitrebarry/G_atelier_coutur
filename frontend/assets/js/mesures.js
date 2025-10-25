

// prix ajoute
// NOUVEAU : Gestionnaire des modèles existants
// Configuration globale
window.API_BASE_URL = 'http://localhost:8081';

class ModelManager {
    constructor() {
        this.models = [];
        this.selectedModel = null;
        this.currentCategory = 'all';
        this.atelierId = null;
        this.initialized = false;
        this.baseUrl = window.API_BASE_URL || 'http://localhost:8081';
    }

    async init() {
        console.log('🚀 Initialisation ModelManager...');
        
        try {
            await this.waitForUserData();
            await this.loadAtelierId();
            
            if (this.atelierId) {
                await this.loadModels();
            }
            
            this.setupEventListeners();
            this.initialized = true;
            console.log('✅ ModelManager initialisé avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation ModelManager:', error);
            throw error;
        }
    }

    async waitForUserData(maxWaitTime = 5000) {
        console.log('⏳ Attente des données utilisateur...');
        
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkUserData = () => {
                const userData = this.getUserData();
                
                if (userData && userData.atelierId) {
                    console.log('✅ Données utilisateur disponibles');
                    resolve(userData);
                    return;
                }
                
                if (Date.now() - startTime > maxWaitTime) {
                    console.warn('⚠️ Timeout attente données utilisateur');
                    reject(new Error('Timeout attente données utilisateur'));
                    return;
                }
                
                setTimeout(checkUserData, 100);
            };
            
            checkUserData();
        });
    }

    getUserData() {
        if (window.currentUser) {
            return window.currentUser;
        }
        
        const storedUser = localStorage.getItem('userData') || localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch (e) {
                console.warn('❌ Erreur parsing données utilisateur:', e);
            }
        }
        
        return null;
    }

    async loadAtelierId() {
        console.log('🔍 Chargement de l\'atelier ID depuis les données utilisateur...');
        
        const userData = this.getUserData();
        
        if (userData && userData.atelierId) {
            this.atelierId = userData.atelierId;
            console.log('✅ Atelier ID trouvé dans les données utilisateur:', this.atelierId);
            return;
        }
        
        console.warn('⚠️ Atelier ID non trouvé dans les données utilisateur, tentative de secours...');
        this.atelierId = this.getAtelierIdFromFallback();
        
        if (this.atelierId) {
            console.log('✅ Atelier ID récupéré via méthode de secours:', this.atelierId);
        } else {
            console.error('❌ Impossible de récupérer l\'atelier ID');
            throw new Error('Atelier ID non disponible');
        }
    }

    getAtelierIdFromFallback() {
        console.log('🔍 Recherche atelier ID via méthodes de secours...');
        
        const storedAtelier = localStorage.getItem('currentAtelier');
        if (storedAtelier) {
            try {
                const atelierData = JSON.parse(storedAtelier);
                console.log('✅ Atelier ID trouvé dans localStorage:', atelierData.id);
                return atelierData.id;
            } catch (e) {
                console.warn('❌ Erreur parsing atelier storage:', e);
            }
        }
        
        const atelierHiddenField = document.querySelector('input[name="atelierId"], #atelierId, [data-atelier-id]');
        if (atelierHiddenField && atelierHiddenField.value) {
            console.log('✅ Atelier ID trouvé dans champ caché:', atelierHiddenField.value);
            return atelierHiddenField.value;
        }
        
        const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.atelierId) {
                    console.log('✅ Atelier ID trouvé dans le token JWT:', payload.atelierId);
                    return payload.atelierId;
                }
            } catch (e) {
                console.warn('❌ Erreur décodage token:', e);
            }
        }
        
        return null;
    }

    async loadModels() {
        try {
            if (!this.atelierId) {
                throw new Error('Atelier ID non disponible');
            }

            const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
            if (!token) {
                throw new Error('Token non trouvé');
            }

            console.log('🔍 Chargement modèles pour atelier:', this.atelierId);

            const response = await fetch(`${this.baseUrl}/api/clients/modeles/atelier/${this.atelierId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('📡 Statut réponse:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erreur détaillée:', errorText);
                throw new Error(`Erreur ${response.status} lors du chargement des modèles`);
            }

            this.models = await response.json();
            console.log('📦 Modèles chargés:', this.models.length, 'modèles trouvés');
            this.renderModels();
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement des modèles:', error);
            this.showError('Impossible de charger les modèles: ' + error.message);
        }
    }

    // Méthode utilitaire pour générer les URLs d'image
    getImageUrl(photoPath) {
        return photoPath 
            ? `${this.baseUrl}/model_photo/${photoPath}`
            : 'assets/images/default-model.png';
    }

    renderModels() {
        const grid = document.getElementById('modelsGrid');
        if (!grid) {
            console.error('❌ Élément modelsGrid non trouvé');
            return;
        }
        
        const filteredModels = this.currentCategory === 'all' 
            ? this.models 
            : this.models.filter(model => model.categorie === this.currentCategory);

        if (filteredModels.length === 0) {
            grid.innerHTML = '<div class="text-center py-3 text-muted">Aucun modèle disponible pour cette catégorie</div>';
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
        card.className = `model-card ${this.selectedModel?.id === model.id ? 'selected' : ''}`;
        
        const imageUrl = this.getImageUrl(model.photoPath);
        
        card.innerHTML = `
            <img src="${imageUrl}" 
                 alt="${model.nom}" 
                 class="model-image"
                 onerror="modelManager.handleImageError(this)">
            <div class="model-name">${model.nom}</div>
            ${model.prix ? `<div class="model-price">${model.prix} FCFA</div>` : ''}
        `;

        card.addEventListener('click', () => this.previewModel(model));
        return card;
    }

    handleImageError(img) {
        console.warn('❌ Erreur chargement image, utilisation image par défaut');
        img.src = 'assets/images/default-model.png';
        img.onerror = null;
    }

   previewModel(model) {
    try {
        this.selectedModel = model;
        
        const imageUrl = this.getImageUrl(model.photoPath);
        
        // ✅ Liste de tous les éléments à mettre à jour avec leurs valeurs par défaut
        const elementsToUpdate = [
            { id: 'modelPreviewImage', type: 'src', value: imageUrl },
            { id: 'modelPreviewName', type: 'textContent', value: model.nom },
            { id: 'modelPreviewDescription', type: 'textContent', value: model.description || 'Modèle de l\'atelier' },
            { id: 'modelPreviewCategory', type: 'textContent', value: model.categorie || 'Non spécifiée' },
            { id: 'modelPreviewPrice', type: 'textContent', value: model.prix ? `${model.prix} FCFA` : 'Non spécifié' }
        ];
        
        // ✅ Mettre à jour chaque élément s'il existe
        elementsToUpdate.forEach(item => {
            const element = document.getElementById(item.id);
            if (element) {
                if (item.type === 'src') {
                    element.src = item.value;
                    element.onerror = () => this.handleImageError(element);
                } else {
                    element[item.type] = item.value;
                }
            } else {
                console.warn(`⚠️ Élément ${item.id} non trouvé`);
            }
        });
        
        // ✅ Afficher le modal
        const modalElement = document.getElementById('modelPreviewModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            console.error('❌ Modal modelPreviewModal non trouvé');
            this.showError('Impossible d\'afficher les détails du modèle');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'affichage du modèle:', error);
        this.showError('Erreur lors de l\'affichage du modèle');
    }
}
    // selectCurrentModel() {
    //     if (!this.selectedModel) return;
        
    //     const imageUrl = this.getImageUrl(this.selectedModel.photoPath);
    //     const avatar = document.getElementById('avatar');
    //     avatar.src = imageUrl;
    //     avatar.onerror = () => this.handleImageError(avatar);
    //     avatar.style.objectFit = "cover";
        
    //     document.getElementById('selectedModelId').value = this.selectedModel.id;
    //     document.getElementById('photoInput').value = '';
    //     this.updateModelSelection();
        
    //     const modal = bootstrap.Modal.getInstance(document.getElementById('modelPreviewModal'));
    //     if (modal) modal.hide();
        
    //     console.log('✅ Modèle sélectionné:', this.selectedModel);
    //     this.showSuccessMessage(`Modèle "${this.selectedModel.nom}" sélectionné`);
    // }
      
    selectCurrentModel() {
        if (!this.selectedModel) return;
        
        const imageUrl = this.getImageUrl(this.selectedModel.photoPath);
        const avatar = document.getElementById('avatar');
        avatar.src = imageUrl;
        avatar.onerror = () => this.handleImageError(avatar);
        avatar.style.objectFit = "cover";
        
        // ✅ CORRECTION : Mettre à jour les DEUX champs cachés
        document.getElementById('selectedModelId').value = this.selectedModel.id;
        document.getElementById('modeleNom').value = this.selectedModel.nom;
        
        document.getElementById('photoInput').value = '';
        this.updateModelSelection();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('modelPreviewModal'));
        if (modal) modal.hide();
        
        console.log('✅ Modèle sélectionné:', this.selectedModel);
        console.log('📝 selectedModelId:', this.selectedModel.id);
        console.log('📝 modeleNom:', this.selectedModel.nom);
        
        this.showSuccessMessage(`Modèle "${this.selectedModel.nom}" sélectionné`);
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
        const categorieSelect = document.getElementById('categorieModele');
        if (categorieSelect) {
            categorieSelect.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.renderModels();
            });
        }

        const selectBtn = document.getElementById('selectModelBtn');
        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                this.selectCurrentModel();
            });
        }

      
       const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.addEventListener('change', () => {
            // ✅ CORRECTION : Réinitialiser TOUS les champs du modèle
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
            
            console.log('🔄 Photo personnelle sélectionnée - Modèle réinitialisé');
        });
    }
    }

    showError(message) {
        const grid = document.getElementById('modelsGrid');
        if (grid) {
            grid.innerHTML = `<div class="alert alert-warning text-center">${message}</div>`;
        }
        
        // ✅ CORRECTION : Utilisation de SweetAlert au lieu de alert
        Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: message,
            timer: 4000,
            showConfirmButton: false
        });
    }

    showSuccessMessage(message) {
        // ✅ CORRECTION : Utilisation de SweetAlert au lieu de toast Bootstrap
        Swal.fire({
            icon: 'success',
            title: 'Succès',
            text: message,
            timer: 3000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
            background: '#d1e7dd',
            color: '#0f5132'
        });
    }
}

// Initialisation
let modelManager;

document.addEventListener("DOMContentLoaded", async function () {
    console.log('🚀 Démarrage application...');
    
    try {
        if (typeof ModelManager === 'undefined') {
            throw new Error('ModelManager n\'est pas défini');
        }
        
        console.log('🔧 Initialisation ModelManager...');
        modelManager = new ModelManager();
        
        if (typeof modelManager.init !== 'function') {
            throw new Error('modelManager.init n\'est pas une fonction');
        }
        
        await modelManager.init();
        console.log('✅ ModelManager initialisé avec succès');
    } catch (error) {
        console.error('❌ Erreur initialisation ModelManager:', error);
        const grid = document.getElementById('modelsGrid');
        if (grid) {
            grid.innerHTML = `<div class="alert alert-danger text-center">Erreur lors du chargement des modèles: ${error.message}</div>`;
        }
        
        // ✅ CORRECTION : Utilisation de SweetAlert pour les erreurs d'initialisation
        Swal.fire({
            icon: 'error',
            title: 'Erreur d\'initialisation',
            text: 'Impossible de charger les modèles: ' + error.message,
            confirmButtonText: 'OK'
        });
    }
    // ... LE RESTE DE VOTRE CODE EXISTANT POUR LE FORMULAIRE ...
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
    
    // Éléments du modal
    const priceModal = new bootstrap.Modal(document.getElementById('priceModal'));
    const modelPriceInput = document.getElementById('modelPrice');
    const confirmSaveBtn = document.getElementById('confirmSave');
  
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

  genderRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.value === "Femme") {
        avatar.src = "assets/images/model4.jpg";
      } else {
        avatar.src = "assets/images/model3.jpg";
      }
    });
  });

  // Fonction simple pour vérifier si un champ est vide
  function isEmpty(value) {
    return !value || value.trim() === "";
  }

  // Validation améliorée
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
      if (!el || isEmpty(el.value)) {
        errors.push(`Le champ ${field.label} est obligatoire.`);
      }
    });

    // Validation spécifique pour le contact (8 chiffres)
    const contact = document.getElementById("contact_cl").value;
    if (contact && !/^\d{8}$/.test(contact)) {
      errors.push("Le contact doit contenir exactement 8 chiffres.");
    }
    // const email = document.getElementById("email_cl").value;
    // if (email && !/^\d{8}$/.test(email)) {
    //   errors.push("L'email doit contenir exactement au moins 8 caracters.");
    // }
    // Validation du type de vêtement pour les femmes
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
    return true;
  }

  // Réinitialiser le modal
  function resetModal() {
    modelPriceInput.value = '';
    modelPriceInput.classList.remove('is-invalid');
  }

  // Gestionnaire pour le bouton d'enregistrement du formulaire
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

    // Afficher le modal pour le prix
    resetModal();
    priceModal.show();
  });

  // Gestionnaire pour la confirmation dans le modal
  confirmSaveBtn.addEventListener("click", function () {
    if (!validatePrice()) {
      Swal.fire({
        icon: "error",
        title: "Prix invalide",
        text: "Veuillez saisir un prix valide pour le modèle.",
      });
      return;
    }

    // Fermer le modal
    priceModal.hide();

    // Procéder à l'enregistrement
    saveFormData();
  });

  // Validation en temps réel du prix
  modelPriceInput.addEventListener('input', function() {
    validatePrice();
  });


  //   // Ajouter le prix du modèle
  //   formData.append("prix", modelPriceInput.value);
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
                        console.log("⚠️ Doublon genderPreview ignoré:", element.value);
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

    // ✅ AJOUT : Logging CRITIQUE pour le modèle sélectionné
    const selectedModelId = document.getElementById('selectedModelId').value;
    const modeleNom = document.getElementById('modeleNom').value;
    
    console.log("=== 🎯 INFORMATIONS MODÈLE SELECTIONNÉ ===");
    console.log("selectedModelId:", selectedModelId);
    console.log("modeleNom:", modeleNom);
    console.log("=== FIN INFORMATIONS MODÈLE ===");

    // ✅ CORRECTION : S'assurer que les champs modèle sont bien ajoutés
    if (selectedModelId) {
        formData.append("selectedModelId", selectedModelId);
    }
    if (modeleNom) {
        formData.append("modeleNom", modeleNom);
    }

    // Ajouter genderPreview UNE SEULE FOIS
    const selectedGender = document.querySelector('input[name="genderPreview"]:checked');
    if (selectedGender && !addedFields.has('genderPreview')) {
        formData.append("genderPreview", selectedGender.value);
        addedFields.add('genderPreview');
    }

    // Ajouter le prix du modèle
    formData.append("prix", modelPriceInput.value);

    // Ajouter la photo si elle existe
    if (photoInput.files.length > 0) {
        formData.append("photo", photoInput.files[0]);
    }

    // ✅ LOG COMPLET des données envoyées
    console.log("📤 DONNÉES FINALES ENVOYÉES:");
    for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
    }

    // Ajouter la photo si elle existe
    if (photoInput.files.length > 0) {
      formData.append("photo", photoInput.files[0]);
    }

    console.log("📤 Données envoyées CORRIGÉES:");
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
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

    // ✅ CORRECTION : Ajouter un loader pour éviter les double-clics
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';

    fetch("http://localhost:8081/api/clients/ajouter", {
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
          console.error("❌ Erreur réponse:", text);
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

        // Reset form & avatar
        form.reset();
        avatar.src = defaultImage;
        avatar.style.objectFit = "contain";

        // Reset affichage des sections
        femmeOptions.style.display = "none";
        mesuresRobe.style.display = "none";
        mesuresJupe.style.display = "none";
        mesuresHomme.style.display = "none";

        // Reset sélection des cartes option
        optionCards.forEach((c) => c.classList.remove("selected"));
        
        // Reset les radios gender
        document.getElementById('previewFemale').checked = true;
        
        // Recharger la liste des clients si la fonction existe
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
      // ✅ CORRECTION : Toujours réactiver le bouton
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    });
  }
});