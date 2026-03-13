
/* global Common, bootstrap */

// Fonction globale pour ouvrir la modal de profil
function openProfileModal() {
    try {
        const profileModalElement = document.getElementById('profileModal');
        if (profileModalElement) {
            const profileModal = new bootstrap.Modal(profileModalElement);
            profileModal.show();
        } else {
            console.error('Modal de profil non trouvée');
            Common.showErrorMessage('Impossible d\'ouvrir le profil');
        }
    } catch (error) {
        console.error('Erreur lors de l\'ouverture du profil:', error);
        Common.showErrorMessage('Erreur lors de l\'ouverture du profil');
    }
}

function buildApiUrl(path) {
    if (typeof Common !== 'undefined' && typeof Common.buildApiUrl === 'function') {
        return Common.buildApiUrl(path);
    }
    const base = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)
        ? String(window.APP_CONFIG.API_BASE_URL).replace(/\/+$/, '')
        : (window.location.hostname === 'localhost' ? 'http://localhost:8081/api' : `${window.location.origin}/api`);
    const clean = String(path || '').replace(/^\/+/, '');
    return `${base}/${clean}`;
}

function buildMediaUrl(path) {
    if (typeof Common !== 'undefined' && typeof Common.buildMediaUrl === 'function') {
        return Common.buildMediaUrl(path);
    }
    const base = (window.APP_CONFIG && window.APP_CONFIG.MEDIA_BASE_URL)
        ? String(window.APP_CONFIG.MEDIA_BASE_URL).replace(/\/+$/, '')
        : (window.location.hostname === 'localhost' ? 'http://localhost:8081' : window.location.origin);
    const clean = String(path || '').replace(/^\/+/, '');
    return `${base}/${clean}`;
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initialisation de la gestion du profil...');
    initializeProfileModal();
    setupProfileEventListeners();
    
    // Attendre un peu que les données utilisateur soient chargées
    setTimeout(() => {
        loadUserProfileInHeader();
    }, 500);
});

// OU mieux : écouter un événement personnalisé quand les données sont prêtes
document.addEventListener('userDataLoaded', function() {
    console.log('🟢 Données utilisateur chargées, mise à jour du header');
    loadUserProfileInHeader();
});

function initializeProfileModal() {
    const profileModal = document.getElementById('profileModal');
    if (!profileModal) {
        console.error('Modal de profil non trouvée dans le DOM');
        return;
    }

    profileModal.addEventListener('show.bs.modal', function() {
        console.log('Ouverture de la modal de profil');
        loadUserProfile();
    });

    profileModal.addEventListener('hidden.bs.modal', function() {
        resetPhotoPreview();
        const passwordForm = document.getElementById('changePasswordForm');
        if (passwordForm) passwordForm.reset();
    });
}

function setupProfileEventListeners() {
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    const photoUpload = document.getElementById('photoUpload');
    const savePhotoBtn = document.getElementById('savePhotoBtn');

    if (changePhotoBtn) {
        changePhotoBtn.addEventListener('click', function() {
            if (photoUpload) photoUpload.click();
        });
    }

    if (photoUpload) {
        photoUpload.addEventListener('change', handlePhotoSelect);
    }

    if (savePhotoBtn) {
        savePhotoBtn.addEventListener('click', saveUserPhoto);
    }

    if (removePhotoBtn) {
        removePhotoBtn.addEventListener('click', removeUserPhoto);
    }

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handlePasswordChange);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            Common.logout();
        });
    }
}

function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        Common.showErrorMessage('Veuillez sélectionner une image valide (JPEG, PNG, etc.)');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        Common.showErrorMessage('La taille de l\'image ne doit pas dépasser 5MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('previewImage');
        const photoPreviewContainer = document.getElementById('photoPreviewContainer');
        
        if (previewImage) previewImage.src = e.target.result;
        if (photoPreviewContainer) photoPreviewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function saveUserPhoto() {
    const photoUpload = document.getElementById('photoUpload');
    if (!photoUpload || !photoUpload.files[0]) {
        Common.showErrorMessage('Veuillez sélectionner une photo');
        return;
    }

    const token = Common.getToken();
    const userData = Common.getUserData();
    
    if (!token) {
        Common.showErrorMessage("Token non disponible. Veuillez vous reconnecter.");
        return;
    }

    const formData = new FormData();
    formData.append('photo', photoUpload.files[0]);

    try {
        const response = await fetch(buildApiUrl(`utilisateurs/${userData.userId}/photo`), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            Common.showSuccessMessage('Photo de profil mise à jour avec succès');
            updateLocalUserData({ photoPath: result.photoPath });
            loadUserProfile();
            resetPhotoPreview();
        } else {
            if (response.status === 403) {
                Common.showErrorMessage('Accès refusé. Vous ne pouvez modifier que votre propre photo.');
            } else {
                try {
                    const error = await response.json();
                    Common.showErrorMessage(error.error || 'Erreur lors de la mise à jour de la photo');
                } catch (e) {
                    Common.showErrorMessage('Erreur serveur lors de la mise à jour de la photo');
                }
            }
        }
    } catch (error) {
        console.error('Erreur:', error);
        Common.showErrorMessage('Erreur réseau lors de la mise à jour de la photo');
    }
}

async function removeUserPhoto() {
    /* eslint-disable no-restricted-globals */
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?')) {
        return;
    }
    /* eslint-enable no-restricted-globals */

    const token = Common.getToken();
    const userData = Common.getUserData();
    
    if (!token) {
        Common.showErrorMessage("Token non disponible. Veuillez vous reconnecter.");
        return;
    }

    try {
        const response = await fetch(buildApiUrl(`utilisateurs/${userData.userId}/photo`), {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            Common.showSuccessMessage('Photo de profil supprimée avec succès');
            updateLocalUserData({ photoPath: null });
            loadUserProfile();
        } else {
            if (response.status === 403) {
                Common.showErrorMessage('Accès refusé. Vous ne pouvez supprimer que votre propre photo.');
            } else {
                try {
                    const error = await response.json();
                    Common.showErrorMessage(error.error || 'Erreur lors de la suppression de la photo');
                } catch (e) {
                    Common.showErrorMessage('Erreur serveur lors de la suppression de la photo');
                }
            }
        }
    } catch (error) {
        console.error('Erreur:', error);
        Common.showErrorMessage('Erreur réseau lors de la suppression de la photo');
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();

    const token = Common.getToken();
    const userData = Common.getUserData();
    
    if (!token) {
        Common.showErrorMessage("Token non disponible. Veuillez vous reconnecter.");
        return;
    }

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        Common.showErrorMessage('Tous les champs sont obligatoires');
        return;
    }

    if (newPassword !== confirmPassword) {
        Common.showErrorMessage('Les nouveaux mots de passe ne correspondent pas');
        return;
    }

    if (newPassword.length < 6) {
        Common.showErrorMessage('Le mot de passe doit contenir au moins 6 caractères');
        return;
    }

    try {
        const response = await fetch(buildApiUrl(`utilisateurs/${userData.userId}/password`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword,
                confirmPassword: confirmPassword
            })
        });

        if (response.ok) {
            Common.showSuccessMessage('Mot de passe mis à jour avec succès');
            document.getElementById('changePasswordForm').reset();
        } else {
            if (response.status === 403) {
                Common.showErrorMessage('Accès refusé. Vous ne pouvez modifier que votre propre mot de passe.');
            } else {
                try {
                    const error = await response.json();
                    Common.showErrorMessage(error.error || 'Erreur lors du changement de mot de passe');
                } catch (e) {
                    Common.showErrorMessage('Erreur serveur lors du changement de mot de passe');
                }
            }
        }
    } catch (error) {
        console.error('Erreur:', error);
        Common.showErrorMessage('Erreur réseau lors du changement de mot de passe');
    }
}

async function loadUserProfile() {
    const token = Common.getToken();
    const userData = Common.getUserData();
    
    if (!token) {
        console.error('Token non disponible');
        return;
    }

    try {
        const response = await fetch(buildApiUrl(`utilisateurs/${userData.userId}/profile`), {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const profileData = await response.json();
            updateProfileDisplay(profileData);
            updateLocalUserData(profileData);
        } else {
            console.error('Erreur lors du chargement du profil:', response.status);
            updateProfileDisplay(userData);
        }
    } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        updateProfileDisplay(userData);
    }
}

function updateProfileDisplay(profileData) {
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) {
        let errorCount = 0;
        
        if (profileData.photoPath) {
            const timestamp = new Date().getTime();
            const photoUrl = `${buildMediaUrl(`user_photo/${profileData.photoPath}`)}?t=${timestamp}`;
            console.log('🖼️ Chargement photo profil:', photoUrl);
            
            profileAvatar.src = photoUrl;
        } else {
            console.log('🖼️ Photo par défaut pour profil');
            profileAvatar.src = buildMediaUrl('assets/images/default-user.jpg');
        }
        
        profileAvatar.onerror = function() {
            errorCount++;
            console.error(`❌ Erreur chargement photo profil (tentative ${errorCount})`);
            
            if (errorCount <= 2) {
                this.src = '/assets/images/default-user.jpg';
            } else {
                console.error('🚨 Arrêt des tentatives, utilisation fallback SVG');
                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNGM0Y0RjYiLz48Y2lyY2xlIGN4PSI3NSIgY3k9IjYwIiByPSIzMCIgZmlsbD0iI0Q4RDhEOCIvPjxyZWN0IHg9IjQ1IiB5PSI5MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiByeD0iNSIgZmlsbD0iI0Q4RDhEOCIvPjwvc3ZnPg==';
            }
        };
        
        profileAvatar.onload = function() {
            console.log('✅ Photo profil chargée avec succès');
            errorCount = 0;
        };
    }
}

function updateHeaderDisplay(profileData) {
    const headerUserImg = document.getElementById('headerUserImg');
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');

    if (headerUserImg) {
        let errorCount = 0;
        
        if (profileData.photoPath) {
            const timestamp = new Date().getTime();
            const photoUrl = `${buildMediaUrl(`user_photo/${profileData.photoPath}`)}?t=${timestamp}`;
            console.log('🖼️ Chargement photo header:', photoUrl);
            
            headerUserImg.src = photoUrl;
            headerUserImg.style.display = 'block';
        } else {
            console.log('🖼️ Photo par défaut pour header');
            headerUserImg.src = buildMediaUrl('assets/images/default-user.jpg');
            headerUserImg.style.display = 'block';
        }
        
        headerUserImg.onerror = function() {
            errorCount++;
            console.error(`❌ Erreur chargement photo header (tentative ${errorCount})`);
            
            if (errorCount <= 2) {
                this.src = '/assets/images/default-user.jpg';
            } else {
                console.error('🚨 Arrêt des tentatives, utilisation fallback SVG');
                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iI0YzRjRGNiIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMTYiIHI9IjgiIGZpbGw9IiNEOEQ4RDgiLz48cmVjdCB4PSIxMiIgeT0iMjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMiIgcng9IjIiIGZpbGw9IiNEOEQ4RDgiLz48L3N2Zz4=';
            }
        };
        
        headerUserImg.onload = function() {
            console.log('✅ Photo header chargée avec succès');
            errorCount = 0;
        };
    }

    if (userName) {
        const fullName = `${profileData.prenom || ''} ${profileData.nom || ''}`.trim();
        userName.textContent = fullName || 'Utilisateur';
        console.log('✅ Nom affiché:', fullName);
    }

    if (userRole) {
        userRole.textContent = getRoleDisplayName(profileData.role);
        console.log('✅ Rôle affiché:', profileData.role);
    }
}


function loadUserProfileInHeader() {
    console.log('🔄 Chargement du profil dans le header...');
    
    const userData = Common.getUserData();
    
    if (!userData || !userData.userId) {
        console.warn('⚠️ Données utilisateur non disponibles, nouvel essai dans 1s');
        setTimeout(loadUserProfileInHeader, 1000);
        return;
    }
    
    // Forcer le rechargement depuis l'API
    loadUserProfileForHeader();
}

// NOUVELLE FONCTION : Charger le profil spécifiquement pour le header
async function loadUserProfileForHeader() {
    const token = Common.getToken();
    const userData = Common.getUserData();
    
    if (!token || !userData.userId) {
        console.error('Token ou userId non disponible');
        return;
    }

    try {
        console.log('📡 Chargement du profil depuis l\'API...');
        const response = await fetch(buildApiUrl(`utilisateurs/${userData.userId}/profile`), {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const profileData = await response.json();
            updateHeaderDisplay(profileData);
            updateLocalUserData(profileData);
        } else {
            console.error('❌ Erreur API profil:', response.status);
            // Utiliser les données locales en fallback
            updateHeaderDisplay(userData);
        }
    } catch (error) {
        console.error('❌ Erreur chargement profil:', error);
        // Utiliser les données locales en fallback
        updateHeaderDisplay(userData);
    }
}

function getRoleDisplayName(role) {
    const roleNames = {
        'SUPERADMIN': 'Super Administrateur',
        'PROPRIETAIRE': 'Propriétaire',
        'TAILLEUR': 'Tailleur',
        'SECRETAIRE': 'Secrétaire'
    };
    return roleNames[role] || role || 'Connecté';
}

function resetPhotoPreview() {
    const photoPreviewContainer = document.getElementById('photoPreviewContainer');
    const photoUpload = document.getElementById('photoUpload');
    
    if (photoPreviewContainer) photoPreviewContainer.style.display = 'none';
    if (photoUpload) photoUpload.value = '';
}

function updateLocalUserData(newData) {
    const storedData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (storedData) {
        const userData = JSON.parse(storedData);
        const updatedData = { ...userData, ...newData };
        
        if (localStorage.getItem('userData')) {
            localStorage.setItem('userData', JSON.stringify(updatedData));
        } else {
            sessionStorage.setItem('userData', JSON.stringify(updatedData));
        }
    }
}

// Exposer les fonctions globalement
window.openProfileModal = openProfileModal;