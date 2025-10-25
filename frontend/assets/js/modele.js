// models.js - Gestion des modèles (Version corrigée)

let modelesData = [];
let currentAtelierId = null;
let currentEditingModeleId = null;
const API_BASE_URL = 'http://localhost:8081/api';

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation du module modèles');
    
    // Vérifier les permissions
    if (!Common.hasPermission('MODELE_VIEW')) {
        Common.showErrorMessage('Accès refusé. Vous n\'avez pas la permission de gérer les modèles.');
        window.location.href = 'home.html';
        return;
    }

    // Récupérer l'ID de l'atelier
    const userData = Common.getUserData();
    currentAtelierId = userData.atelierId || userData.atelier?.id;
    
    if (!currentAtelierId) {
        Common.showErrorMessage('Atelier non configuré');
        return;
    }

    initializeModels();
    loadModeles();
    setupEventListeners();
});

// === FONCTIONS API ===
async function apiCall(endpoint, options = {}) {
    try {
        const token = Common.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`❌ Erreur API ${endpoint}:`, error);
        throw error;
    }
}

// === INITIALISATION ===
function initializeModels() {
    console.log('📷 Initialisation du module modèles');
    setupUploadRectangle();
}

function setupEventListeners() {
    // Recherche
    const searchInput = document.getElementById('searchModeles');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filterModeles(e.target.value);
        });
    }

    // Filtre catégorie
    const filterSelect = document.getElementById('filterCategorie');
    if (filterSelect) {
        filterSelect.addEventListener('change', function(e) {
            filterModelesByCategory(e.target.value);
        });
    }
}

// === GESTION UPLOAD PHOTOS AVEC ZONE RECTANGULAIRE ===
function setupUploadRectangle() {
    const uploadRectangle = document.getElementById('modeleUploadRectangle');
    const fileInput = document.getElementById('modelePhotoUpload');
    
    if (uploadRectangle && fileInput) {
        console.log('✅ Initialisation de la zone rectangulaire');

        // Click sur la zone
        uploadRectangle.addEventListener('click', (e) => {
            if (!e.target.closest('.preview-overlay')) {
                fileInput.click();
            }
        });
        
        // Drag & Drop
        uploadRectangle.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadRectangle.classList.add('dragover');
        });
        
        uploadRectangle.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!uploadRectangle.contains(e.relatedTarget)) {
                uploadRectangle.classList.remove('dragover');
            }
        });
        
        uploadRectangle.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadRectangle.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                handleImageUpload(e.dataTransfer.files[0]);
            }
        });
        
        // Changement de fichier
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleImageUpload(e.target.files[0]);
            }
        });

        // Empêcher le comportement par défaut
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }
}

function handleImageUpload(file) {
    console.log('📁 Fichier sélectionné:', file.name);

    if (!file.type.startsWith('image/')) {
        Common.showErrorMessage('Veuillez sélectionner une image valide (JPEG, PNG, etc.)');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        Common.showErrorMessage('L\'image est trop volumineuse (max 5MB)');
        return;
    }

    const fileInput = document.getElementById('modelePhotoUpload');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    if (fileInput) fileInput.files = dataTransfer.files;

    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('modeleImagePreview');
        const previewImage = document.getElementById('modelePreviewImage');
        const uploadRectangle = document.getElementById('modeleUploadRectangle');
        const uploadPlaceholder = document.getElementById('modeleUploadPlaceholder');

        // ✅ D'abord activer la classe "has-image"
        if (uploadRectangle) uploadRectangle.classList.add('has-image');

        // ✅ Mettre l'image et afficher la preview
        if (previewImage) previewImage.src = e.target.result;
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
        if (preview) preview.style.display = 'block';

        console.log('✅ Aperçu affiché avec succès');
    };

    reader.readAsDataURL(file);
}

// Fonction pour changer l'image
function changerImage() {
    const input = document.getElementById('modelePhotoUpload');
    if (input) input.click();
}

// === CHARGEMENT DES DONNÉES ===
async function loadModeles() {
    console.log('📋 Chargement des modèles...');
    
    try {
        Common.showLoading('Chargement des modèles...');
        const modeles = await apiCall(`/modeles/atelier/${currentAtelierId}`);
        modelesData = modeles;
        displayModeles(modeles);
        Common.hideLoading();
    } catch (error) {
        console.error('Erreur chargement modèles:', error);
        Common.hideLoading();
        Common.showErrorMessage('Erreur lors du chargement des modèles');
    }
}

async function searchModeles(searchTerm) {
    try {
        if (!searchTerm.trim()) {
            await loadModeles();
            return;
        }

        Common.showLoading('Recherche en cours...');
        const modeles = await apiCall(`/modeles/atelier/${currentAtelierId}/search?q=${encodeURIComponent(searchTerm)}`);
        displayModeles(modeles);
        Common.hideLoading();
    } catch (error) {
        console.error('Erreur recherche modèles:', error);
        Common.hideLoading();
        Common.showErrorMessage('Erreur lors de la recherche');
    }
}

async function loadModelesByCategory(category) {
    try {
        Common.showLoading('Filtrage en cours...');
        const modeles = await apiCall(`/modeles/atelier/${currentAtelierId}/categorie/${category}`);
        displayModeles(modeles);
        Common.hideLoading();
    } catch (error) {
        console.error('Erreur filtrage modèles:', error);
        Common.hideLoading();
        Common.showErrorMessage('Erreur lors du filtrage');
    }
}

// === AFFICHAGE ===
function displayModeles(modeles) {
    const modelesGrid = document.getElementById('modelesGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!modeles || modeles.length === 0) {
        modelesGrid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    let html = '';
    modeles.forEach(modele => {
        html += createModeleCard(modele);
    });
    
    modelesGrid.innerHTML = html;
}

function createModeleCard(modele) {
    // ✅ UTILISER LE BON ENDPOINT : /model_photo/
    let photoUrl = 'images/default_model.png';
    
    if (modele.photoPath) {
        // Utiliser l'endpoint qui fonctionne déjà pour les clients
        photoUrl = `http://localhost:8081/model_photo/${modele.photoPath}`;
    }
    
    const prixFormatted = new Intl.NumberFormat('fr-FR').format(modele.prix);
    const categorieDisplay = getCategorieDisplayName(modele.categorie);
    
    return `
        <div class="col-xl-3 col-lg-4 col-md-6 mb-4">
            <div class="card modele-card radius-10">
                <div class="card-body p-0">
                    <div class="modele-photo-container">
                        <img src="${photoUrl}" 
                             class="modele-photo" 
                             alt="${modele.nom || 'Modèle'}"
                             onerror="this.onerror=null; this.src='images/default_model.png'">
                        <div class="modele-actions">
                            <button class="btn btn-sm btn-light" onclick="editerModele('${modele.id}')" title="Modifier">
                                <i class="bx bx-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-light" onclick="supprimerModele('${modele.id}')" title="Supprimer">
                                <i class="bx bx-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="p-3">
                        <h6 class="modele-nom fw-bold mb-1">${modele.nom || 'Modèle sans nom'}</h6>
                        <p class="modele-description text-muted small mb-2">
                            ${modele.description || 'Aucune description'}
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="modele-prix fw-bold text-primary">
                                ${prixFormatted} FCFA
                            </span>
                            <span class="badge ${getCategorieBadgeClass(modele.categorie)}">
                                ${categorieDisplay}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// === CRUD MODÈLES ===
function showAjouterModeleModal() {
    currentEditingModeleId = null;
    const modal = new bootstrap.Modal(document.getElementById('modeleModal'));
    document.getElementById('modeleModalTitle').textContent = 'Nouveau Modèle';
    document.getElementById('modeleForm').reset();
    resetUploadRectangle();
    modal.show();
}

function showEditerModeleModal(modeleId) {
    const modele = modelesData.find(m => m.id === modeleId);
    if (!modele) return;

    currentEditingModeleId = modeleId;
    const modal = new bootstrap.Modal(document.getElementById('modeleModal'));
    document.getElementById('modeleModalTitle').textContent = 'Modifier le Modèle';
    
    // Remplir le formulaire
    document.getElementById('nomModele').value = modele.nom || '';
    document.getElementById('categorieModele').value = modele.categorie || '';
    document.getElementById('prixModele').value = modele.prix || '';
    document.getElementById('descriptionModele').value = modele.description || '';
    
    // Afficher l'image existante
    const preview = document.getElementById('modeleImagePreview');
    const previewImage = document.getElementById('modelePreviewImage');
    const uploadRectangle = document.getElementById('modeleUploadRectangle');
    const uploadPlaceholder = document.getElementById('modeleUploadPlaceholder');

    if (modele.photoPath) {
        const photoUrl = `http://localhost:8081/model_photo/${modele.photoPath}`;
        if (previewImage) previewImage.src = photoUrl;
        if (preview) preview.style.display = 'block';
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
        if (uploadRectangle) uploadRectangle.classList.add('has-image');
    } else {
        resetUploadRectangle();
    }
    
    modal.show();
}

function resetUploadRectangle() {
    const uploadRectangle = document.getElementById('modeleUploadRectangle');
    const uploadPlaceholder = document.getElementById('modeleUploadPlaceholder');
    const preview = document.getElementById('modeleImagePreview');
    const fileInput = document.getElementById('modelePhotoUpload');

    // Réinitialiser l'affichage
    if (preview) preview.style.display = 'none';
    if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
    if (uploadRectangle) uploadRectangle.classList.remove('has-image');

    // Réinitialiser l'input file
    if (fileInput) {
        fileInput.value = '';
        const dataTransfer = new DataTransfer();
        fileInput.files = dataTransfer.files;
    }
}

async function sauvegarderModele() {
    const nom = document.getElementById('nomModele').value.trim();
    const categorie = document.getElementById('categorieModele').value;
    const prix = document.getElementById('prixModele').value;
    const description = document.getElementById('descriptionModele').value;
    const photoInput = document.getElementById('modelePhotoUpload');
    const photoFile = photoInput && photoInput.files ? photoInput.files[0] : null;

    console.log('🐛 MODE:', currentEditingModeleId ? 'MODIFICATION' : 'CRÉATION');

    // Validation simple
    if (!nom) {
        Common.showErrorMessage('Le nom du modèle est obligatoire');
        return;
    }
    if (!categorie) {
        Common.showErrorMessage('La catégorie est obligatoire');
        return;
    }
    if (!prix || prix <= 0) {
        Common.showErrorMessage('Le prix doit être supérieur à 0');
        return;
    }

    try {
        Common.showLoading(currentEditingModeleId ? 'Modification en cours...' : 'Création en cours...');

        const token = Common.getToken();
        if (!token) {
            Common.showErrorMessage('Session invalide. Veuillez vous reconnecter.');
            Common.hideLoading();
            return;
        }

        const formData = new FormData();
        
        if (currentEditingModeleId) {
            // MODIFICATION
            const updateData = {
                nom: nom,
                categorie: categorie,
                prix: parseFloat(prix),
                description: description.trim()
            };
            
            formData.append('modele', new Blob([JSON.stringify(updateData)], { 
                type: 'application/json' 
            }));
            
            if (photoFile) {
                formData.append('photo', photoFile);
            }

            const response = await fetch(`${API_BASE_URL}/modeles/${currentEditingModeleId}/atelier/${currentAtelierId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Erreur lors de la modification');
            }

            Common.showSuccessMessage('Modèle modifié avec succès !');
        } else {
            // CRÉATION (SIMPLE - pas de vérification de doublon)
            const createData = {
                nom: nom,
                categorie: categorie,
                prix: parseFloat(prix),
                description: description.trim(),
                atelierId: currentAtelierId
            };
            
            formData.append('modele', new Blob([JSON.stringify(createData)], { 
                type: 'application/json' 
            }));
            
            if (photoFile) {
                formData.append('photo', photoFile);
            }

            const response = await fetch(`${API_BASE_URL}/modeles`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Erreur lors de la création');
            }

            Common.showSuccessMessage('Modèle créé avec succès !');
        }

        // Fermer la modal et recharger
        const modal = bootstrap.Modal.getInstance(document.getElementById('modeleModal'));
        modal.hide();
        await loadModeles();

    } catch (error) {
        console.error('Erreur sauvegarde modèle:', error);
        Common.showErrorMessage(error.message || 'Erreur lors de la sauvegarde du modèle');
    } finally {
        Common.hideLoading();
    }
}
async function editerModele(modeleId) {
    showEditerModeleModal(modeleId);
}

async function supprimerModele(modeleId) {
    const modele = modelesData.find(m => m.id === modeleId);
    if (!modele) return;

    try {
        const result = await Swal.fire({
            title: 'Supprimer ce modèle ?',
            text: `"${modele.nom}" sera désactivé`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Oui, supprimer',
            cancelButtonText: 'Annuler',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            Common.showLoading('Suppression en cours...');
            await apiCall(`/modeles/${modeleId}/atelier/${currentAtelierId}`, {
                method: 'DELETE'
            });
            
            await Swal.fire({
                icon: 'success',
                title: 'Modèle supprimé !',
                timer: 3000,
                showConfirmButton: false
            });
            
            await loadModeles();
        }
    } catch (error) {
        console.error('Erreur suppression modèle:', error);
        Common.showErrorMessage('Erreur lors de la suppression du modèle');
    } finally {
        Common.hideLoading();
    }
}

// === FILTRES ET RECHERCHE ===
function filterModeles(searchTerm) {
    searchModeles(searchTerm);
}

function filterModelesByCategory(category) {
    if (!category) {
        loadModeles();
    } else {
        loadModelesByCategory(category);
    }
}

// === FONCTIONS UTILITAIRES ===
function getCategorieDisplayName(categorie) {
    const categories = {
        'ROBE': 'Robe',
        'JUPE': 'Jupe',
        'HOMME': 'Homme',
        'ENFANT': 'Enfant',
        'AUTRE': 'Autre'
    };
    return categories[categorie] || categorie;
}

function getCategorieBadgeClass(categorie) {
    const classes = {
        'ROBE': 'bg-light-pink text-pink',
        'JUPE': 'bg-light-purple text-purple',
        'HOMME': 'bg-light-blue text-blue',
        'ENFANT': 'bg-light-orange text-orange',
        'AUTRE': 'bg-light-secondary text-secondary'
    };
    return classes[categorie] || 'bg-light-secondary text-secondary';
}

// Réinitialiser quand la modal se ferme
document.getElementById('modeleModal').addEventListener('hidden.bs.modal', function () {
    currentEditingModeleId = null;
    document.getElementById('modeleForm').reset();
    resetUploadRectangle();
});

console.log('✅ Module modèles chargé');