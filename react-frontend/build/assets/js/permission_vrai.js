
// deuxieme version
// Vérifier que SweetAlert2 est chargé
if (typeof Swal === 'undefined') {
    console.error('❌ SweetAlert2 non chargé!');
    // Fallback vers les alertes natives
    window.successMessage = function(message) {
        alert('✅ ' + message);
    };
    window.errorMessage = function(message) {
        alert('❌ ' + message);
    };
} else {
    console.log('✅ SweetAlert2 chargé avec succès');
}

const API_BASE_URL = "http://localhost:8081";

// Fonction pour récupérer le token
function getToken() {
    return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
}

// Fonction pour récupérer les données utilisateur
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
    };
}

// Fonction pour vérifier les permissions (SUPERADMIN et PROPRIETAIRE peuvent accéder)
function checkPermission() {
    const userData = getUserData();
    const allowedRoles = ['SUPERADMIN', 'PROPRIETAIRE'];
    
    if (!allowedRoles.includes(userData.role)) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: "error",
                title: "Accès refusé",
                text: "Cette fonctionnalité est réservée aux administrateurs.",
                confirmButtonColor: "#d33",
            }).then(() => {
                window.location.href = 'home.html'; 
            });
        } else {
            alert('❌ Accès refusé. Cette fonctionnalité est réservée aux administrateurs.');
            window.location.href = 'home.html';
        }
        return false;
    }
    return true;
}

// Fonction pour afficher les messages de succès (avec vérification Swal)
function successMessage(message) {
    if (typeof Swal !== 'undefined') {
        return Swal.fire({
            icon: "success",
            title: "Succès",
            text: message,
            position: "center",
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: true,
            confirmButtonText: "OK",
            confirmButtonColor: "#28a745"
        });
    } else {
        alert('✅ ' + message);
    }
}

// Fonction pour afficher les messages d'erreur (avec vérification Swal)
function errorMessage(message) {
    if (typeof Swal !== 'undefined') {
        return Swal.fire({
            icon: "error",
            title: "Erreur",
            text: message,
            confirmButtonColor: "#d33",
        });
    } else {
        alert('❌ ' + message);
    }
}

// Fonction pour gérer les erreurs d'API
async function handleApiError(response, context) {
    if (response.status === 401) {
        logout();
        return true;
    }

    if (response.status === 403) {
        errorMessage("Accès refusé. Vous n'avez pas les permissions nécessaires.");
        return true;
    }

    if (response.status >= 500) {
        errorMessage("Erreur serveur. Veuillez réessayer plus tard.");
        return true;
    }

    return false;
}

// Fonction de déconnexion
function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userData");
    window.location.href = "index.html";
}

// Variables globales
let allPermissions = [];
let allUsers = [];
let selectedUserId = null;
let selectedUserPermissions = new Set();

// Charger les utilisateurs
async function loadUsers() {
    try {
        const token = getToken();
        if (!token) {
            errorMessage("Token non disponible. Veuillez vous reconnecter.");
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/utilisateurs`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            allUsers = await response.json();
            displayUsers(allUsers);
        } else {
            if (await handleApiError(response, "chargement utilisateurs")) return;
            errorMessage("Erreur lors du chargement des utilisateurs");
        }
    } catch (error) {
        console.error('Erreur:', error);
        errorMessage('Une erreur est survenue lors du chargement des utilisateurs');
    }
}

// Afficher la liste des utilisateurs
function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    if (!usersList) {
        console.error('❌ Element #usersList non trouvé');
        return;
    }
    
    usersList.innerHTML = '';

    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'list-group-item user-card p-3';
        userElement.dataset.userId = user.id;
        userElement.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="flex-shrink-0">
                    <div class="user-avatar">
                        ${user.prenom?.charAt(0) || ''}${user.nom?.charAt(0) || ''}
                    </div>
                </div>
                <div class="flex-grow-1 ms-3">
                    <div class="user-name fw-bold">${user.prenom || ''} ${user.nom || ''}</div>
                    <div class="user-email small text-muted">${user.email || ''}</div>
                    <span class="badge bg-secondary">${user.role || ''}</span>
                </div>
            </div>
        `;

        userElement.addEventListener('click', () => selectUser(user.id));
        usersList.appendChild(userElement);
    });
}

// Charger toutes les permissions
async function loadAllPermissions() {
    try {
        const token = getToken();
        if (!token) {
            errorMessage("Token non disponible. Veuillez vous reconnecter.");
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/admin/permissions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            allPermissions = await response.json();
            console.log('✅ Permissions chargées:', allPermissions.length);
        } else {
            if (await handleApiError(response, "chargement permissions")) return;
            errorMessage("Erreur lors du chargement des permissions");
        }
    } catch (error) {
        console.error('Erreur:', error);
        errorMessage('Une erreur est survenue lors du chargement des permissions');
    }
}

// Sélectionner un utilisateur
async function selectUser(userId) {
    selectedUserId = userId;

    // Mettre en évidence l'utilisateur sélectionné
    document.querySelectorAll('.user-card').forEach(card => {
        if (card.dataset.userId === userId) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // Afficher le nom de l'utilisateur sélectionné
    const selectedUser = allUsers.find(u => u.id == userId);
    const selectedUserName = document.getElementById('selectedUserName');
    if (selectedUserName) {
        selectedUserName.textContent = `${selectedUser.prenom} ${selectedUser.nom}`;
    }

    // Afficher le bouton d'enregistrement
    const saveButtonContainer = document.getElementById('saveButtonContainer');
    if (saveButtonContainer) {
        saveButtonContainer.style.display = 'block';
    }

    // Charger les permissions de cet utilisateur
    await loadUserPermissions(userId);
}

// Charger les permissions d'un utilisateur
async function loadUserPermissions(userId) {
    try {
        const token = getToken();
        if (!token) {
            errorMessage("Token non disponible. Veuillez vous reconnecter.");
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/admin/utilisateurs/${userId}/permissions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const userPermissions = await response.json();
            selectedUserPermissions = new Set(userPermissions.map(p => p.id));
            
            // ✅ CORRECTION : Afficher dans le tableau organisé
            renderUserPermissionsTable();
            
        } else {
            if (await handleApiError(response, "chargement permissions utilisateur")) return;
            errorMessage("Erreur lors du chargement des permissions de l'utilisateur");
        }
    } catch (error) {
        console.error('Erreur:', error);
        errorMessage('Une erreur est survenue lors du chargement des permissions');
    }
}

// ✅ NOUVELLE FONCTION : Afficher les permissions dans un tableau organisé avec checkboxes
function renderUserPermissionsTable() {
    const container = document.getElementById('permissionsList');
    if (!container) {
        console.error('❌ Element #permissionsList non trouvé');
        return;
    }
    
    if (!selectedUserId) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-user-check fa-2x mb-3"></i>
                <p class="mb-0">Sélectionnez un utilisateur pour gérer ses permissions</p>
            </div>
        `;
        return;
    }

    // Grouper les permissions par module
    const permissionsByModule = {};
    allPermissions.forEach(permission => {
        const module = permission.code.split('_')[0];
        if (!permissionsByModule[module]) {
            permissionsByModule[module] = [];
        }
        permissionsByModule[module].push(permission);
    });

    if (Object.keys(permissionsByModule).length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-inbox fa-2x mb-3"></i>
                <p class="mb-0">Aucune permission disponible</p>
            </div>
        `;
        return;
    }

    let tableHTML = `
        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
            <table class="table table-sm table-hover mb-0">
                <thead class="table-light sticky-top">
                    <tr>
                        <th width="40" class="text-center">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="selectAllPermissions">
                            </div>
                        </th>
                        <th width="120">Module</th>
                        <th width="150">Action</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Parcourir chaque module
    Object.keys(permissionsByModule).sort().forEach(module => {
        permissionsByModule[module].forEach(permission => {
            const isChecked = Array.from(selectedUserPermissions).some(id => id === permission.id);
            const action = permission.code.split('_')[1] || permission.code; // Récupère la partie après le module
            
            tableHTML += `
                <tr class="permission-row ${isChecked ? 'table-success' : ''}">
                    <td class="text-center">
                        <div class="form-check">
                            <input class="form-check-input permission-checkbox" 
                                   type="checkbox" 
                                   value="${permission.id}"
                                   ${isChecked ? 'checked' : ''}
                                   data-permission-id="${permission.id}">
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-primary">${module}</span>
                    </td>
                    <td>
                        <span class="fw-bold text-uppercase small">${action}</span>
                    </td>
                    <td class="small">${permission.description}</td>
                </tr>
            `;
        });
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
        <div class="p-3 border-top bg-light">
            <div class="row align-items-center">
                <div class="col">
                    <small class="text-muted">
                        <span id="selectedCount">0</span> permission(s) sélectionnée(s) sur <span id="totalCount">0</span>
                    </small>
                </div>
                <div class="col-auto">
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="clearAllSelections()">
                        <i class="fas fa-times me-1"></i>Tout désélectionner
                    </button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = tableHTML;

    // Ajouter les écouteurs d'événements
    addTableEventListeners();
    updateSelectedCount();
}

// ✅ NOUVELLE FONCTION : Ajouter les écouteurs pour le tableau
function addTableEventListeners() {
    // Case à cocher "Tout sélectionner"
    const selectAllCheckbox = document.getElementById('selectAllPermissions');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.permission-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
                const row = checkbox.closest('tr');
                if (this.checked) {
                    row.classList.add('table-success');
                } else {
                    row.classList.remove('table-success');
                }
            });
            updateSelectedCount();
        });
    }

    // Cases à cocher individuelles
    document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateSelectedCount();
            updateSelectAllCheckbox();
            
            // Mettre à jour le style de la ligne
            const row = this.closest('tr');
            if (this.checked) {
                row.classList.add('table-success');
            } else {
                row.classList.remove('table-success');
            }
        });
    });

    // Mettre à jour le compteur total
    const totalCount = document.querySelectorAll('.permission-checkbox').length;
    const totalCountElement = document.getElementById('totalCount');
    if (totalCountElement) {
        totalCountElement.textContent = totalCount;
    }
}

// ✅ NOUVELLE FONCTION : Mettre à jour le compteur de permissions sélectionnées
function updateSelectedCount() {
    const selectedCount = document.querySelectorAll('.permission-checkbox:checked').length;
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = selectedCount;
    }
}

// ✅ NOUVELLE FONCTION : Mettre à jour la case "Tout sélectionner"
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllPermissions');
    const checkboxes = document.querySelectorAll('.permission-checkbox');
    
    if (selectAllCheckbox && checkboxes.length > 0) {
        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        const someChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);
        
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = someChecked && !allChecked;
    }
}

// ✅ NOUVELLE FONCTION : Tout désélectionner
function clearAllSelections() {
    document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        const row = checkbox.closest('tr');
        row.classList.remove('table-success');
    });
    updateSelectedCount();
    updateSelectAllCheckbox();
}

// ✅ NOUVELLE FONCTION : Récupérer les permissions sélectionnées depuis le tableau
function getSelectedPermissionsFromTable() {
    const selectedPermissions = new Set();
    document.querySelectorAll('.permission-checkbox:checked').forEach(checkbox => {
        selectedPermissions.add(checkbox.value);
    });
    return selectedPermissions;
}

// Enregistrer les permissions modifiées - VERSION CORRIGÉE
async function savePermissions() {
    console.log("🔍 Début savePermissions");
    
    if (!selectedUserId) {
        errorMessage("Veuillez sélectionner un utilisateur");
        return;
    }

    const token = getToken();
    if (!token) {
        errorMessage("Token non disponible. Veuillez vous reconnecter.");
        return;
    }

    // ✅ CORRECTION : Récupérer les permissions depuis le tableau
    const selectedPermissionIds = getSelectedPermissionsFromTable();

    console.log("📤 Envoi des permissions pour l'utilisateur:", selectedUserId);
    console.log("Permissions sélectionnées:", Array.from(selectedPermissionIds));

    // Afficher un loader pendant l'envoi
    const saveBtn = document.getElementById('savePermissions');
    if (saveBtn) {
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/utilisateurs/${selectedUserId}/permissions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(Array.from(selectedPermissionIds))
            });

            console.log("📥 Réponse reçue - Status:", response.status);

            if (response.ok) {
                const result = await response.json();
                console.log("✅ Réponse du serveur:", result);
                
                // Message de succès
                successMessage("Les permissions ont été mises à jour avec succès !");
                
                // Recharger les permissions pour vérifier la mise à jour
                await loadUserPermissions(selectedUserId);
                
            } else {
                console.error("❌ Erreur réponse:", response.status);
                
                let errorMsg = "Erreur lors de la mise à jour des permissions";
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorData.error || errorMsg;
                } catch (e) {
                    console.error("Impossible de parser la réponse d'erreur");
                }
                
                errorMessage(errorMsg);
            }
        } catch (error) {
            console.error('💥 Erreur réseau:', error);
            errorMessage('Erreur de connexion: ' + error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }
}



// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de la page permissions');
    
    // Vérifier que SweetAlert2 est disponible
    if (typeof Swal === 'undefined') {
        console.warn('⚠️ SweetAlert2 non disponible, utilisation des alertes natives');
    }

    // Vérifier les permissions
    if (!checkPermission()) {
        return;
    }

    // Charger les données
    loadUsers();
    loadAllPermissions();

    // Événements
    const saveBtn = document.getElementById('savePermissions');
    if (saveBtn) {
        saveBtn.addEventListener('click', savePermissions);
    }

    const submitCreatePermission = document.getElementById('submitCreatePermission');
    if (submitCreatePermission) {
        submitCreatePermission.addEventListener('click', createPermission);
    }

    // Recherche d'utilisateurs
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const userElements = document.querySelectorAll('.user-card');
            
            userElements.forEach(element => {
                const userName = element.querySelector('.user-name')?.textContent.toLowerCase() || '';
                const userEmail = element.querySelector('.user-email')?.textContent.toLowerCase() || '';
                
                if (userName.includes(searchTerm) || userEmail.includes(searchTerm)) {
                    element.style.display = 'flex';
                } else {
                    element.style.display = 'none';
                }
            });
        });
    }
    document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de la page permissions');

    if (typeof Swal === 'undefined') {
        console.warn('⚠️ SweetAlert2 non disponible, utilisation des alertes natives');
    }

    // Vérifier les permissions
    if (!checkPermission()) {
        return;
    }

    // ⚙️ Masquer le bouton "Ajouter une permission" si non SUPERADMIN
    const userData = getUserData();
    if (userData.role !== 'SUPERADMIN') {
        const addPermissionBtn = document.querySelector('[data-bs-target="#ajouterPermissionModal"]');
        if (addPermissionBtn) {
            addPermissionBtn.style.display = 'none';
        }
    }

    // Charger les données
    loadUsers();
    loadAllPermissions();

    // Événements
    const saveBtn = document.getElementById('savePermissions');
    if (saveBtn) {
        saveBtn.addEventListener('click', savePermissions);
    }

    const submitCreatePermission = document.getElementById('submitCreatePermission');
    if (submitCreatePermission) {
        submitCreatePermission.addEventListener('click', createPermission);
    }

    // Recherche d'utilisateurs
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const userElements = document.querySelectorAll('.user-card');
            
            userElements.forEach(element => {
                const userName = element.querySelector('.user-name')?.textContent.toLowerCase() || '';
                const userEmail = element.querySelector('.user-email')?.textContent.toLowerCase() || '';
                
                if (userName.includes(searchTerm) || userEmail.includes(searchTerm)) {
                    element.style.display = 'flex';
                } else {
                    element.style.display = 'none';
                }
            });
        });
    }
});

});


// // permission.js - SPÉCIFIQUE à la gestion admin des permissions

// const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

// // Fonctions SPÉCIFIQUES à la gestion admin
// function checkAdminPermission() {
//     const userData = Common.getUserData();
//     const allowedRoles = ['SUPERADMIN', 'PROPRIETAIRE'];

//     if (!allowedRoles.includes(userData.role)) {
//         Common.showErrorMessage("Accès refusé. Cette fonctionnalité est réservée aux administrateurs.");
//         return false;
//     }
//     return true;
// }

// // Variables SPÉCIFIQUES à ce fichier
// let allPermissions = [];
// let allUsers = [];
// let selectedUserId = null;
// let selectedUserPermissions = new Set();

// // Fonction pour gérer les erreurs d'API
// async function handleApiError(response, context) {
//     if (response.status === 401) {
//         Common.logout();
//         return true;
//     }

//     if (response.status === 403) {
//         Common.showErrorMessage("Accès refusé. Vous n'avez pas les permissions nécessaires.");
//         return true;
//     }

//     if (response.status >= 500) {
//         Common.showErrorMessage("Erreur serveur. Veuillez réessayer plus tard.");
//         return true;
//     }

//     return false;
// }

// // Charger les utilisateurs - CORRIGÉ
// async function loadUsers() {
//     try {
//         const token = Common.getToken();
//         if (!token) {
//             Common.showErrorMessage("Token non disponible. Veuillez vous reconnecter.");
//             return;
//         }

//         console.log('📡 Chargement des utilisateurs...');

//         const response = await fetch(`${API_BASE_URL}/api/utilisateurs`, {
//             headers: {
//                 'Authorization': `Bearer ${token}`
//             }
//         });

//         if (response.ok) {
//             allUsers = await response.json();
//             console.log('✅ Utilisateurs chargés:', allUsers.length);
//             displayUsers(allUsers);
//         } else {
//             if (await handleApiError(response, "chargement utilisateurs")) return;
//             Common.showErrorMessage("Erreur lors du chargement des utilisateurs");
//         }
//     } catch (error) {
//         console.error('❌ Erreur chargement utilisateurs:', error);
//         Common.showErrorMessage('Une erreur est survenue lors du chargement des utilisateurs');
//     }
// }

// // Afficher la liste des utilisateurs - CORRIGÉ
// function displayUsers(users) {
//     const usersList = document.getElementById('usersList');
//     if (!usersList) {
//         console.error('❌ Element #usersList non trouvé');
//         return;
//     }

//     usersList.innerHTML = '';

//     if (!users || users.length === 0) {
//         usersList.innerHTML = `
//             <div class="text-center text-muted py-4">
//                 <i class="fas fa-users fa-2x mb-3"></i>
//                 <p class="mb-0">Aucun utilisateur trouvé</p>
//             </div>
//         `;
//         return;
//     }

//     users.forEach(user => {
//         // ✅ VÉRIFICATION que l'utilisateur a un ID valide
//         if (!user.id) {
//             console.warn('⚠️ Utilisateur sans ID:', user);
//             return;
//         }

//         const userElement = document.createElement('div');
//         userElement.className = 'list-group-item user-card p-3';
//         userElement.dataset.userId = user.id;
//         userElement.innerHTML = `
//             <div class="d-flex align-items-center">
//                 <div class="flex-shrink-0">
//                     <div class="user-avatar">
//                         ${user.prenom?.charAt(0) || ''}${user.nom?.charAt(0) || ''}
//                     </div>
//                 </div>
//                 <div class="flex-grow-1 ms-3">
//                     <div class="user-name fw-bold">${user.prenom || ''} ${user.nom || ''}</div>
//                     <div class="user-email small text-muted">${user.email || ''}</div>
//                     <span class="badge bg-secondary">${user.role || ''}</span>
//                 </div>
//             </div>
//         `;

//         userElement.addEventListener('click', () => {
//             console.log('👤 Sélection utilisateur:', user.id);
//             selectUser(user.id);
//         });
//         usersList.appendChild(userElement);
//     });
// }
// // Charger toutes les permissions
// async function loadAllPermissions() {
//     try {
//         const token = Common.getToken();
//         if (!token) {
//             Common.showErrorMessage("Token non disponible. Veuillez vous reconnecter.");
//             return;
//         }

//         const response = await fetch(`${API_BASE_URL}/api/admin/permissions`, {
//             headers: {
//                 'Authorization': `Bearer ${token}`
//             }
//         });

//         if (response.ok) {
//             allPermissions = await response.json();
//             console.log('✅ Permissions chargées:', allPermissions.length);
//         } else {
//             if (await handleApiError(response, "chargement permissions")) return;
//             Common.showErrorMessage("Erreur lors du chargement des permissions");
//         }
//     } catch (error) {
//         console.error('Erreur:', error);
//         Common.showErrorMessage('Une erreur est survenue lors du chargement des permissions');
//     }
// }

// // Sélectionner un utilisateur - CORRIGÉ
// async function selectUser(userId) {
//     // ✅ VÉRIFICATION DE L'ID
//     if (!userId || userId === 'undefined') {
//         console.error('❌ ID utilisateur invalide lors de la sélection');
//         Common.showErrorMessage("Utilisateur invalide");
//         return;
//     }

//     selectedUserId = userId;

//     // Mettre en évidence l'utilisateur sélectionné
//     document.querySelectorAll('.user-card').forEach(card => {
//         if (card.dataset.userId === userId) {
//             card.classList.add('selected');
//         } else {
//             card.classList.remove('selected');
//         }
//     });

//     // Afficher le nom de l'utilisateur sélectionné
//     const selectedUser = allUsers.find(u => u.id == userId);
//     const selectedUserName = document.getElementById('selectedUserName');
//     if (selectedUserName && selectedUser) {
//         selectedUserName.textContent = `${selectedUser.prenom} ${selectedUser.nom}`;
//     } else {
//         selectedUserName.textContent = "Utilisateur inconnu";
//     }

//     // Afficher le bouton d'enregistrement
//     const saveButtonContainer = document.getElementById('saveButtonContainer');
//     if (saveButtonContainer) {
//         saveButtonContainer.style.display = 'block';
//     }

//     // Charger les permissions de cet utilisateur
//     await loadUserPermissions(userId);
// }

// // permission.js - POUR LA PAGE DE GESTION DES PERMISSIONS
// async function loadUserPermissions(userId) {
//     try {
//         // ✅ VÉRIFICATION CRITIQUE - S'assurer que userId est valide
//         if (!userId || userId === 'undefined' || userId === 'null') {
//             console.error('❌ ID utilisateur invalide:', userId);
//             Common.showErrorMessage("ID utilisateur invalide");
//             return;
//         }

//         const token = Common.getToken();
//         if (!token) {
//             Common.showErrorMessage("Token non disponible. Veuillez vous reconnecter.");
//             return;
//         }

//         console.log('📡 Chargement permissions pour utilisateur:', userId);

//         const response = await fetch(`${API_BASE_URL}/api/admin/utilisateurs/${userId}/permissions`, {
//             headers: {
//                 'Authorization': `Bearer ${token}`
//             }
//         });

//         if (response.ok) {
//             const userPermissions = await response.json();
//             selectedUserPermissions = new Set(userPermissions.map(p => p.id));

//             console.log('✅ Permissions utilisateur chargées:', userPermissions.length);

//             // Afficher dans le tableau organisé
//             renderUserPermissionsTable();

//         } else {
//             if (await handleApiError(response, "chargement permissions utilisateur")) return;

//             // Gestion spécifique des erreurs
//             if (response.status === 400) {
//                 Common.showErrorMessage("Requête invalide. Vérifiez l'ID utilisateur.");
//             } else {
//                 Common.showErrorMessage("Erreur lors du chargement des permissions de l'utilisateur");
//             }
//         }
//     } catch (error) {
//         console.error('❌ Erreur chargement permissions:', error);
//         Common.showErrorMessage('Une erreur est survenue lors du chargement des permissions');
//     }
// }
// // Afficher les permissions dans un tableau organisé avec checkboxes
// function renderUserPermissionsTable() {
//     const container = document.getElementById('permissionsList');
//     if (!container) {
//         console.error('❌ Element #permissionsList non trouvé');
//         return;
//     }

//     if (!selectedUserId) {
//         container.innerHTML = `
//             <div class="text-center text-muted py-5">
//                 <i class="fas fa-user-check fa-2x mb-3"></i>
//                 <p class="mb-0">Sélectionnez un utilisateur pour gérer ses permissions</p>
//             </div>
//         `;
//         return;
//     }

//     // Grouper les permissions par module
//     const permissionsByModule = {};
//     allPermissions.forEach(permission => {
//         const module = permission.code.split('_')[0];
//         if (!permissionsByModule[module]) {
//             permissionsByModule[module] = [];
//         }
//         permissionsByModule[module].push(permission);
//     });

//     if (Object.keys(permissionsByModule).length === 0) {
//         container.innerHTML = `
//             <div class="text-center text-muted py-4">
//                 <i class="fas fa-inbox fa-2x mb-3"></i>
//                 <p class="mb-0">Aucune permission disponible</p>
//             </div>
//         `;
//         return;
//     }

//     let tableHTML = `
//         <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
//             <table class="table table-sm table-hover mb-0">
//                 <thead class="table-light sticky-top">
//                     <tr>
//                         <th width="40" class="text-center">
//                             <div class="form-check">
//                                 <input class="form-check-input" type="checkbox" id="selectAllPermissions">
//                             </div>
//                         </th>
//                         <th width="120">Module</th>
//                         <th width="150">Action</th>
//                         <th>Description</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//     `;

//     // Parcourir chaque module
//     Object.keys(permissionsByModule).sort().forEach(module => {
//         permissionsByModule[module].forEach(permission => {
//             const isChecked = Array.from(selectedUserPermissions).some(id => id === permission.id);
//             const action = permission.code.split('_')[1] || permission.code;

//             tableHTML += `
//                 <tr class="permission-row ${isChecked ? 'table-success' : ''}">
//                     <td class="text-center">
//                         <div class="form-check">
//                             <input class="form-check-input permission-checkbox" 
//                                    type="checkbox" 
//                                    value="${permission.id}"
//                                    ${isChecked ? 'checked' : ''}
//                                    data-permission-id="${permission.id}">
//                         </div>
//                     </td>
//                     <td>
//                         <span class="badge bg-primary">${module}</span>
//                     </td>
//                     <td>
//                         <span class="fw-bold text-uppercase small">${action}</span>
//                     </td>
//                     <td class="small">${permission.description}</td>
//                 </tr>
//             `;
//         });
//     });

//     tableHTML += `
//                 </tbody>
//             </table>
//         </div>
//         <div class="p-3 border-top bg-light">
//             <div class="row align-items-center">
//                 <div class="col">
//                     <small class="text-muted">
//                         <span id="selectedCount">0</span> permission(s) sélectionnée(s) sur <span id="totalCount">0</span>
//                     </small>
//                 </div>
//                 <div class="col-auto">
//                     <button type="button" class="btn btn-sm btn-outline-secondary" onclick="clearAllSelections()">
//                         <i class="fas fa-times me-1"></i>Tout désélectionner
//                     </button>
//                 </div>
//             </div>
//         </div>
//     `;

//     container.innerHTML = tableHTML;

//     // Ajouter les écouteurs d'événements
//     addTableEventListeners();
//     updateSelectedCount();
// }

// // Ajouter les écouteurs pour le tableau
// function addTableEventListeners() {
//     // Case à cocher "Tout sélectionner"
//     const selectAllCheckbox = document.getElementById('selectAllPermissions');
//     if (selectAllCheckbox) {
//         selectAllCheckbox.addEventListener('change', function () {
//             const checkboxes = document.querySelectorAll('.permission-checkbox');
//             checkboxes.forEach(checkbox => {
//                 checkbox.checked = this.checked;
//                 const row = checkbox.closest('tr');
//                 if (this.checked) {
//                     row.classList.add('table-success');
//                 } else {
//                     row.classList.remove('table-success');
//                 }
//             });
//             updateSelectedCount();
//         });
//     }

//     // Cases à cocher individuelles
//     document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
//         checkbox.addEventListener('change', function () {
//             updateSelectedCount();
//             updateSelectAllCheckbox();

//             // Mettre à jour le style de la ligne
//             const row = this.closest('tr');
//             if (this.checked) {
//                 row.classList.add('table-success');
//             } else {
//                 row.classList.remove('table-success');
//             }
//         });
//     });

//     // Mettre à jour le compteur total
//     const totalCount = document.querySelectorAll('.permission-checkbox').length;
//     const totalCountElement = document.getElementById('totalCount');
//     if (totalCountElement) {
//         totalCountElement.textContent = totalCount;
//     }
// }

// // Mettre à jour le compteur de permissions sélectionnées
// function updateSelectedCount() {
//     const selectedCount = document.querySelectorAll('.permission-checkbox:checked').length;
//     const countElement = document.getElementById('selectedCount');
//     if (countElement) {
//         countElement.textContent = selectedCount;
//     }
// }

// // Mettre à jour la case "Tout sélectionner"
// function updateSelectAllCheckbox() {
//     const selectAllCheckbox = document.getElementById('selectAllPermissions');
//     const checkboxes = document.querySelectorAll('.permission-checkbox');

//     if (selectAllCheckbox && checkboxes.length > 0) {
//         const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
//         const someChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);

//         selectAllCheckbox.checked = allChecked;
//         selectAllCheckbox.indeterminate = someChecked && !allChecked;
//     }
// }

// // Tout désélectionner
// function clearAllSelections() {
//     document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
//         checkbox.checked = false;
//         const row = checkbox.closest('tr');
//         row.classList.remove('table-success');
//     });
//     updateSelectedCount();
//     updateSelectAllCheckbox();
// }

// // Récupérer les permissions sélectionnées depuis le tableau
// function getSelectedPermissionsFromTable() {
//     const selectedPermissions = new Set();
//     document.querySelectorAll('.permission-checkbox:checked').forEach(checkbox => {
//         selectedPermissions.add(checkbox.value);
//     });
//     return selectedPermissions;
// }

// // Enregistrer les permissions modifiées
// async function savePermissions() {
//     console.log("🔍 Début savePermissions");

//     if (!selectedUserId) {
//         Common.showErrorMessage("Veuillez sélectionner un utilisateur");
//         return;
//     }

//     const token = Common.getToken();
//     if (!token) {
//         Common.showErrorMessage("Token non disponible. Veuillez vous reconnecter.");
//         return;
//     }

//     // Récupérer les permissions depuis le tableau
//     const selectedPermissionIds = getSelectedPermissionsFromTable();

//     console.log("📤 Envoi des permissions pour l'utilisateur:", selectedUserId);
//     console.log("Permissions sélectionnées:", Array.from(selectedPermissionIds));

//     // Afficher un loader pendant l'envoi
//     const saveBtn = document.getElementById('savePermissions');
//     if (saveBtn) {
//         const originalText = saveBtn.innerHTML;
//         saveBtn.disabled = true;
//         saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';

//         try {
//             const response = await fetch(`${API_BASE_URL}/api/admin/utilisateurs/${selectedUserId}/permissions`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify(Array.from(selectedPermissionIds))
//             });

//             console.log("📥 Réponse reçue - Status:", response.status);

//             if (response.ok) {
//                 const result = await response.json();
//                 console.log("✅ Réponse du serveur:", result);

//                 // Message de succès
//                 Common.showSuccessMessage("Les permissions ont été mises à jour avec succès !");

//                 // Recharger les permissions pour vérifier la mise à jour
//                 await loadUserPermissions(selectedUserId);

//             } else {
//                 console.error("❌ Erreur réponse:", response.status);

//                 let errorMsg = "Erreur lors de la mise à jour des permissions";
//                 try {
//                     const errorData = await response.json();
//                     errorMsg = errorData.message || errorData.error || errorMsg;
//                 } catch (e) {
//                     console.error("Impossible de parser la réponse d'erreur");
//                 }

//                 Common.showErrorMessage(errorMsg);
//             }
//         } catch (error) {
//             console.error('💥 Erreur réseau:', error);
//             Common.showErrorMessage('Erreur de connexion: ' + error.message);
//         } finally {
//             saveBtn.disabled = false;
//             saveBtn.innerHTML = originalText;
//         }
//     }
// }

// // Initialisation
// document.addEventListener('DOMContentLoaded', function () {
//     console.log('🚀 Initialisation de la page permissions');

//     // Vérifier que SweetAlert2 est disponible
//     if (typeof Swal === 'undefined') {
//         console.warn('⚠️ SweetAlert2 non disponible, utilisation des alertes natives');
//     }

//     // Vérifier les permissions ADMIN
//     if (!checkAdminPermission()) {
//         return;
//     }

//     // Charger les données
//     loadUsers();
//     loadAllPermissions();

//     // Événements
//     const saveBtn = document.getElementById('savePermissions');
//     if (saveBtn) {
//         saveBtn.addEventListener('click', savePermissions);
//     }

//     // Recherche d'utilisateurs
//     const userSearch = document.getElementById('userSearch');
//     if (userSearch) {
//         userSearch.addEventListener('input', function (e) {
//             const searchTerm = e.target.value.toLowerCase();
//             const userElements = document.querySelectorAll('.user-card');

//             userElements.forEach(element => {
//                 const userName = element.querySelector('.user-name')?.textContent.toLowerCase() || '';
//                 const userEmail = element.querySelector('.user-email')?.textContent.toLowerCase() || '';

//                 if (userName.includes(searchTerm) || userEmail.includes(searchTerm)) {
//                     element.style.display = 'flex';
//                 } else {
//                     element.style.display = 'none';
//                 }
//             });
//         });
//     }

//     // Masquer le bouton "Ajouter une permission" si non SUPERADMIN
//     const userData = Common.getUserData();
//     if (userData.role !== 'SUPERADMIN') {
//         const addPermissionBtn = document.querySelector('[data-bs-target="#ajouterPermissionModal"]');
//         if (addPermissionBtn) {
//             addPermissionBtn.style.display = 'none';
//         }
//     }
// });

// // Exposer les fonctions globalement pour les événements onclick
// window.clearAllSelections = clearAllSelections;
// window.savePermissions = savePermissions;

// permission.js - SPÉCIFIQUE à la gestion admin des permissions


