
// Configuration
// const API_BASE_URL = 'http://localhost:8081';
// const apiUtilisateurs = `${API_BASE_URL}/api/utilisateurs`;
	if (typeof window.API_BASE_URL === 'undefined') {
		window.API_BASE_URL = "http://localhost:8081";
	}
	if (typeof window.apiUtilisateurs === 'undefined') {
		window.apiUtilisateurs = `${API_BASE_URL}/api/utilisateurs`;
	}

// Fonction globale pour ouvrir la modal de profil
function openProfileModal() {
    try {
        const profileModalElement = document.getElementById('profileModal');
        if (profileModalElement) {
            const profileModal = new bootstrap.Modal(profileModalElement);
            profileModal.show();
        } else {
            console.error('Modal de profil non trouvée');
            errorMessage('Impossible d\'ouvrir le profil');
        }
    } catch (error) {
        console.error('Erreur lors de l\'ouverture du profil:', error);
        errorMessage('Erreur lors de l\'ouverture du profil');
    }
}

// Fonctions utilitaires
function getToken() {
    return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
}

function getUserData() {
    const userData = JSON.parse(
        localStorage.getItem("userData") ||
        sessionStorage.getItem("userData") ||
        "{}"
    );
    return {
        userId: userData.id || userData.userId,
        role: userData.role || "",
        atelierId: userData.atelierId || (userData.atelier ? userData.atelier.id : null),
        nom: userData.nom || "",
        prenom: userData.prenom || "",
        email: userData.email || "",
        photoPath: userData.photoPath || null
    };
}

function successMessage(message) {
    Swal.fire({
        icon: "success",
        title: "Succès",
        text: message,
        toast: true,
        position: "top-end",
        timer: 2500,
        timerProgressBar: true,
        showConfirmButton: false,
    });
}

function errorMessage(message) {
    Swal.fire({
        icon: "error",
        title: "Erreur",
        text: message,
        confirmButtonColor: "#d33",
        showConfirmButton: true,
        position: "center",
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initialisation de la gestion du profil...');
    initializeProfileModal();
    setupProfileEventListeners();
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
            logout();
        });
    }
}

function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        errorMessage('Veuillez sélectionner une image valide (JPEG, PNG, etc.)');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        errorMessage('La taille de l\'image ne doit pas dépasser 5MB');
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
        errorMessage('Veuillez sélectionner une photo');
        return;
    }

    const token = getToken();
    const userData = getUserData();
    
    if (!token) {
        errorMessage("Token non disponible. Veuillez vous reconnecter.");
        return;
    }

    const formData = new FormData();
    formData.append('photo', photoUpload.files[0]);

    try {
        const response = await fetch(`${apiUtilisateurs}/${userData.userId}/photo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            successMessage('Photo de profil mise à jour avec succès');
            updateLocalUserData({ photoPath: result.photoPath });
            loadUserProfile();
            resetPhotoPreview();
        } else {
            if (response.status === 403) {
                errorMessage('Accès refusé. Vous ne pouvez modifier que votre propre photo.');
            } else {
                try {
                    const error = await response.json();
                    errorMessage(error.error || 'Erreur lors de la mise à jour de la photo');
                } catch (e) {
                    errorMessage('Erreur serveur lors de la mise à jour de la photo');
                }
            }
        }
    } catch (error) {
        console.error('Erreur:', error);
        errorMessage('Erreur réseau lors de la mise à jour de la photo');
    }
}

async function removeUserPhoto() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?')) {
        return;
    }

    const token = getToken();
    const userData = getUserData();
    
    if (!token) {
        errorMessage("Token non disponible. Veuillez vous reconnecter.");
        return;
    }

    try {
        const response = await fetch(`${apiUtilisateurs}/${userData.userId}/photo`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            successMessage('Photo de profil supprimée avec succès');
            updateLocalUserData({ photoPath: null });
            loadUserProfile();
        } else {
            if (response.status === 403) {
                errorMessage('Accès refusé. Vous ne pouvez supprimer que votre propre photo.');
            } else {
                try {
                    const error = await response.json();
                    errorMessage(error.error || 'Erreur lors de la suppression de la photo');
                } catch (e) {
                    errorMessage('Erreur serveur lors de la suppression de la photo');
                }
            }
        }
    } catch (error) {
        console.error('Erreur:', error);
        errorMessage('Erreur réseau lors de la suppression de la photo');
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();

    const token = getToken();
    const userData = getUserData();
    
    if (!token) {
        errorMessage("Token non disponible. Veuillez vous reconnecter.");
        return;
    }

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        errorMessage('Tous les champs sont obligatoires');
        return;
    }

    if (newPassword !== confirmPassword) {
        errorMessage('Les nouveaux mots de passe ne correspondent pas');
        return;
    }

    if (newPassword.length < 6) {
        errorMessage('Le mot de passe doit contenir au moins 6 caractères');
        return;
    }

    try {
        const response = await fetch(`${apiUtilisateurs}/${userData.userId}/password`, {
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
            successMessage('Mot de passe mis à jour avec succès');
            document.getElementById('changePasswordForm').reset();
        } else {
            if (response.status === 403) {
                errorMessage('Accès refusé. Vous ne pouvez modifier que votre propre mot de passe.');
            } else {
                try {
                    const error = await response.json();
                    errorMessage(error.error || 'Erreur lors du changement de mot de passe');
                } catch (e) {
                    errorMessage('Erreur serveur lors du changement de mot de passe');
                }
            }
        }
    } catch (error) {
        console.error('Erreur:', error);
        errorMessage('Erreur réseau lors du changement de mot de passe');
    }
}

async function loadUserProfile() {
    const token = getToken();
    const userData = getUserData();
    
    if (!token) {
        console.error('Token non disponible');
        return;
    }

    try {
        const response = await fetch(`${apiUtilisateurs}/${userData.userId}/profile`, {
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
    console.log('🎨 Mise à jour profil:', profileData);
    
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) {
        // Anti-boucle : variable pour suivre les tentatives
        let errorCount = 0;
        
        if (profileData.photoPath) {
            const timestamp = new Date().getTime();
            const photoUrl = `${API_BASE_URL}/user_photo/${profileData.photoPath}?t=${timestamp}`;
            console.log('🖼️ Chargement photo profil:', photoUrl);
            
            profileAvatar.src = photoUrl;
        } else {
            console.log('🖼️ Photo par défaut pour profil');
            profileAvatar.src = `${API_BASE_URL}/assets/images/default-user.jpg`;
        }
        
        profileAvatar.onerror = function() {
            errorCount++;
            console.error(`❌ Erreur chargement photo profil (tentative ${errorCount})`);
            
            if (errorCount <= 2) {
                // Première tentative : utiliser URL relative
                this.src = '/assets/images/default-user.jpg';
            } else {
                // Deuxième tentative échouée : utiliser image SVG inline
                console.error('🚨 Arrêt des tentatives, utilisation fallback SVG');
                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNGM0Y0RjYiLz48Y2lyY2xlIGN4PSI3NSIgY3k9IjYwIiByPSIzMCIgZmlsbD0iI0Q4RDhEOCIvPjxyZWN0IHg9IjQ1IiB5PSI5MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiByeD0iNSIgZmlsbD0iI0Q4RDhEOCIvPjwvc3ZnPg==';
            }
        };
        
        profileAvatar.onload = function() {
            console.log('✅ Photo profil chargée avec succès');
            errorCount = 0; // Réinitialiser le compteur
        };
    }
}

function updateHeaderDisplay(profileData) {
    console.log('🎨 Mise à jour header:', profileData);
    
    const headerUserImg = document.getElementById('headerUserImg');
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');

    if (headerUserImg) {
        // Anti-boucle : variable pour suivre les tentatives
        let errorCount = 0;
        
        if (profileData.photoPath) {
            const timestamp = new Date().getTime();
            const photoUrl = `${API_BASE_URL}/user_photo/${profileData.photoPath}?t=${timestamp}`;
            console.log('🖼️ Chargement photo header:', photoUrl);
            
            headerUserImg.src = photoUrl;
        } else {
            console.log('🖼️ Photo par défaut pour header');
            headerUserImg.src = `${API_BASE_URL}/assets/images/default-user.jpg`;
        }
        
        headerUserImg.onerror = function() {
            errorCount++;
            console.error(`❌ Erreur chargement photo header (tentative ${errorCount})`);
            
            if (errorCount <= 2) {
                // Première tentative : utiliser URL relative
                this.src = '/assets/images/default-user.jpg';
            } else {
                // Deuxième tentative échouée : utiliser image SVG inline
                console.error('🚨 Arrêt des tentatives, utilisation fallback SVG');
                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iI0YzRjRGNiIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMTYiIHI9IjgiIGZpbGw9IiNEOEQ4RDgiLz48cmVjdCB4PSIxMiIgeT0iMjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMiIgcng9IjIiIGZpbGw9IiNEOEQ4RDgiLz48L3N2Zz4=';
            }
        };
        
        headerUserImg.onload = function() {
            console.log('✅ Photo header chargée avec succès');
            errorCount = 0; // Réinitialiser le compteur
        };
    }

    if (userName) {
        userName.textContent = `${profileData.prenom || ''} ${profileData.nom || ''}`.trim() || 'Utilisateur';
    }

    if (userRole) {
        userRole.textContent = getRoleDisplayName(profileData.role);
    }
}

function loadUserProfileInHeader() {
    const userData = getUserData();
    updateHeaderDisplay(userData);
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

function logout() {
    Swal.fire({
        title: 'Déconnexion',
        text: 'Êtes-vous sûr de vouloir vous déconnecter ?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Oui, se déconnecter',
        cancelButtonText: 'Annuler'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('userData');
            window.location.href = 'index.html';
        }
    });
}