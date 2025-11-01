

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
// let currentUserData = null;

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

// // Charger les utilisateurs - FILTRÉ POUR PROPRIÉTAIRE
// async function loadUsers() {
//     try {
//         const token = Common.getToken();
//         if (!token) {
//             Common.showErrorMessage("Token non disponible. Veuillez vous reconnecter.");
//             return;
//         }

//         // Récupérer les données de l'utilisateur connecté
//         currentUserData = Common.getUserData();
//         console.log('👤 Utilisateur connecté:', currentUserData);

//         console.log('📡 Chargement des utilisateurs...');

//         const response = await fetch(`${API_BASE_URL}/api/utilisateurs`, {
//             headers: {
//                 'Authorization': `Bearer ${token}`
//             }
//         });

//         if (response.ok) {
//             let users = await response.json();
//             console.log('✅ Utilisateurs chargés:', users.length);

//             // FILTRAGE: Le propriétaire ne doit pas se voir lui-même
//             if (currentUserData.role === 'PROPRIETAIRE') {
//                 users = users.filter(user => {
//                     // Exclure le propriétaire lui-même
//                     const isSelf = user.id === currentUserData.userId;
//                     // Inclure uniquement les tailleurs et secrétaires
//                     const isSubordinate = user.role === 'TAILLEUR' || user.role === 'SECRETAIRE';
                    
//                     return !isSelf && isSubordinate;
//                 });
//                 console.log('🔍 Utilisateurs filtrés pour propriétaire:', users.length);
//             }

//             allUsers = users;
//             displayUsers(allUsers);
//             updateUserListHeader();
//         } else {
//             if (await handleApiError(response, "chargement utilisateurs")) return;
//             Common.showErrorMessage("Erreur lors du chargement des utilisateurs");
//         }
//     } catch (error) {
//         console.error('❌ Erreur chargement utilisateurs:', error);
//         Common.showErrorMessage('Une erreur est survenue lors du chargement des utilisateurs');
//     }
// }

// // Mettre à jour l'en-tête de la liste des utilisateurs selon le rôle
// function updateUserListHeader() {
//     const userListHeader = document.getElementById('userListHeader');
//     if (!userListHeader) return;

//     if (currentUserData.role === 'PROPRIETAIRE') {
//         userListHeader.innerHTML = `
//             <h6 class="mb-1">Mes Employés</h6>
//             <small class="text-muted">Tailleurs et secrétaires de votre atelier</small>
//         `;
//     } else {
//         userListHeader.innerHTML = `
//             <h6 class="mb-1">Tous les Utilisateurs</h6>
//             <small class="text-muted">Gestion complète des permissions</small>
//         `;
//     }
// }

// // Afficher la liste des utilisateurs
// function displayUsers(users) {
//     const usersList = document.getElementById('usersList');
//     if (!usersList) {
//         console.error('❌ Element #usersList non trouvé');
//         return;
//     }

//     usersList.innerHTML = '';

//     if (!users || users.length === 0) {
//         let emptyMessage = '';
//         if (currentUserData.role === 'PROPRIETAIRE') {
//             emptyMessage = `
//                 <div class="text-center text-muted py-4">
//                     <i class="fas fa-user-friends fa-2x mb-3"></i>
//                     <p class="mb-2 fw-bold">Aucun employé trouvé</p>
//                     <small class="text-muted">
//                         Vous n'avez pas encore de tailleurs ou secrétaires dans votre atelier
//                     </small>
//                 </div>
//             `;
//         } else {
//             emptyMessage = `
//                 <div class="text-center text-muted py-4">
//                     <i class="fas fa-users fa-2x mb-3"></i>
//                     <p class="mb-0">Aucun utilisateur trouvé</p>
//                 </div>
//             `;
//         }
//         usersList.innerHTML = emptyMessage;
//         return;
//     }

//     users.forEach(user => {
//         if (!user.id) {
//             console.warn('⚠️ Utilisateur sans ID:', user);
//             return;
//         }

//         const userElement = document.createElement('div');
//         userElement.className = 'list-group-item user-card p-3';
//         userElement.dataset.userId = user.id;
        
//         const roleClass = getRoleBadgeClass(user.role);
//         const roleText = getRoleDisplayText(user.role);

//         userElement.innerHTML = `
//             <div class="d-flex align-items-center">
//                 <div class="flex-shrink-0">
//                     <div class="user-avatar ${roleClass}">
//                         ${user.prenom?.charAt(0) || ''}${user.nom?.charAt(0) || ''}
//                     </div>
//                 </div>
//                 <div class="flex-grow-1 ms-3">
//                     <div class="user-name fw-bold">${user.prenom || ''} ${user.nom || ''}</div>
//                     <div class="user-email small text-muted">${user.email || ''}</div>
//                     <span class="badge ${roleClass}">${roleText}</span>
//                     ${user.actif === false ? '<span class="badge bg-secondary ms-1">Inactif</span>' : ''}
//                 </div>
//                 ${currentUserData.role === 'PROPRIETAIRE' ? `
//                     <div class="flex-shrink-0">
//                         <i class="fas fa-chevron-right text-muted"></i>
//                     </div>
//                 ` : ''}
//             </div>
//         `;

//         userElement.addEventListener('click', () => {
//             console.log('👤 Sélection utilisateur:', user.id);
//             selectUser(user.id);
//         });
//         usersList.appendChild(userElement);
//     });
// }

// // Fonctions utilitaires pour les rôles
// function getRoleBadgeClass(role) {
//     const classes = {
//         'SUPERADMIN': 'bg-danger',
//         'PROPRIETAIRE': 'bg-primary',
//         'SECRETAIRE': 'bg-info',
//         'TAILLEUR': 'bg-warning'
//     };
//     return classes[role] || 'bg-secondary';
// }

// function getRoleDisplayText(role) {
//     const texts = {
//         'SUPERADMIN': 'Super Admin',
//         'PROPRIETAIRE': 'Propriétaire', 
//         'SECRETAIRE': 'Secrétaire',
//         'TAILLEUR': 'Tailleur'
//     };
//     return texts[role] || role;
// }

// // Sélectionner un utilisateur
// async function selectUser(userId) {
//     if (!userId || userId === 'undefined') {
//         console.error('❌ ID utilisateur invalide lors de la sélection');
//         Common.showErrorMessage("Utilisateur invalide");
//         return;
//     }

//     const selectedUser = allUsers.find(u => u.id == userId);
//     if (!selectedUser) {
//         console.error('❌ Utilisateur non trouvé dans la liste filtrée');
//         Common.showErrorMessage("Utilisateur non autorisé");
//         return;
//     }

//     // Vérification pour propriétaire
//     if (currentUserData.role === 'PROPRIETAIRE') {
//         if (selectedUser.role === 'PROPRIETAIRE' || selectedUser.role === 'SUPERADMIN') {
//             Common.showErrorMessage("Vous ne pouvez pas gérer les permissions d'un autre propriétaire ou administrateur");
//             return;
//         }
//     }

//     selectedUserId = userId;

//     // Mettre en évidence l'utilisateur sélectionné
//     document.querySelectorAll('.user-card').forEach(card => {
//         if (card.dataset.userId === userId) {
//             card.classList.add('selected', 'border-primary');
//         } else {
//             card.classList.remove('selected', 'border-primary');
//         }
//     });

//     // Afficher le nom de l'utilisateur sélectionné avec son rôle
//     const selectedUserName = document.getElementById('selectedUserName');
//     if (selectedUserName && selectedUser) {
//         selectedUserName.innerHTML = `
//             <strong>${selectedUser.prenom} ${selectedUser.nom}</strong>
//             <small class="badge ${getRoleBadgeClass(selectedUser.role)} ms-2">${getRoleDisplayText(selectedUser.role)}</small>
//         `;
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

// // Charger les permissions d'un utilisateur
// async function loadUserPermissions(userId) {
//     try {
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
//             renderUserPermissionsTable();

//         } else {
//             if (await handleApiError(response, "chargement permissions utilisateur")) return;

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

// // Afficher le message d'information pour le propriétaire
// function showProprietaireInfoMessage() {
//     const infoMessage = document.createElement('div');
//     infoMessage.className = 'alert alert-info mb-4';
//     infoMessage.innerHTML = `
//         <div class="d-flex align-items-center">
//             <i class="fas fa-info-circle fa-lg me-3"></i>
//             <div>
//                 <p class="mb-0">
//                     Cette interface vous permet de gérer les permissions de vos tailleurs et secrétaires.
//                 </p>
//             </div>
//         </div>
//     `;
    
//     // Insérer le message au début du contenu principal
//     const cardBody = document.querySelector('.card-body');
//     if (cardBody) {
//         cardBody.insertBefore(infoMessage, cardBody.firstChild);
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

//     // Récupérer les données utilisateur au chargement
//     currentUserData = Common.getUserData();

//     // Afficher le message d'information si c'est un propriétaire
//     if (currentUserData.role === 'PROPRIETAIRE') {
//         showProprietaireInfoMessage();
        
//         // Adapter les titres pour le propriétaire
//         const pageTitle = document.querySelector('h1, .page-title');
//         if (pageTitle) {
//             pageTitle.textContent = 'Gestion des Permissions - Mes Employés';
//         }
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
//     if (currentUserData.role !== 'SUPERADMIN') {
//         const addPermissionBtn = document.querySelector('[data-bs-target="#ajouterPermissionModal"]');
//         if (addPermissionBtn) {
//             addPermissionBtn.style.display = 'none';
//         }
//     }
// });

// // Exposer les fonctions globalement pour les événements onclick
// window.clearAllSelections = clearAllSelections;
// window.savePermissions = savePermissions;


const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

// Fonctions SPÉCIFIQUES à la gestion admin
function checkAdminPermission() {
    const userData = Common.getUserData();
    const allowedRoles = ['SUPERADMIN', 'PROPRIETAIRE'];

    if (!allowedRoles.includes(userData.role)) {
        Common.showErrorMessage("Accès refusé. Cette fonctionnalité est réservée aux administrateurs.");
        return false;
    }
    return true;
}

// Variables SPÉCIFIQUES à ce fichier
let allPermissions = [];
let allUsers = [];
let selectedUserId = null;
let selectedUserPermissions = new Set();
let currentUserData = null;

// Fonction pour gérer les erreurs d'API
async function handleApiError(response, context) {
    if (response.status === 401) {
        Common.logout();
        return true;
    }

    if (response.status === 403) {
        Common.showErrorMessage("Accès refusé. Vous n'avez pas les permissions nécessaires.");
        return true;
    }

    if (response.status >= 500) {
        Common.showErrorMessage("Erreur serveur. Veuillez réessayer plus tard.");
        return true;
    }

    return false;
}

// Charger les utilisateurs - FILTRÉ POUR PROPRIÉTAIRE
async function loadUsers() {
    try {
        const token = Common.getToken();
        if (!token) {
            Common.showErrorMessage("Token non disponible. Veuillez vous reconnecter.");
            return;
        }

        // Récupérer les données de l'utilisateur connecté
        currentUserData = Common.getUserData();
        console.log('👤 Utilisateur connecté:', currentUserData);

        console.log('📡 Chargement des utilisateurs...');

        const response = await fetch(`${API_BASE_URL}/api/utilisateurs`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            let users = await response.json();
            console.log('✅ Utilisateurs chargés:', users.length);

            // FILTRAGE: Le propriétaire ne doit pas se voir lui-même
            if (currentUserData.role === 'PROPRIETAIRE') {
                users = users.filter(user => {
                    // Exclure le propriétaire lui-même
                    const isSelf = user.id === currentUserData.userId;
                    // Inclure uniquement les tailleurs et secrétaires
                    const isSubordinate = user.role === 'TAILLEUR' || user.role === 'SECRETAIRE';
                    
                    return !isSelf && isSubordinate;
                });
                console.log('🔍 Utilisateurs filtrés pour propriétaire:', users.length);
            }

            allUsers = users;
            displayUsers(allUsers);
            updateUserListHeader();
        } else {
            if (await handleApiError(response, "chargement utilisateurs")) return;
            Common.showErrorMessage("Erreur lors du chargement des utilisateurs");
        }
    } catch (error) {
        console.error('❌ Erreur chargement utilisateurs:', error);
        Common.showErrorMessage('Une erreur est survenue lors du chargement des utilisateurs');
    }
}

// Mettre à jour l'en-tête de la liste des utilisateurs selon le rôle
function updateUserListHeader() {
    const userListHeader = document.getElementById('userListHeader');
    if (!userListHeader) return;

    if (currentUserData.role === 'PROPRIETAIRE') {
        userListHeader.innerHTML = `
            <h6 class="mb-1">Mes Employés</h6>
            <small class="text-muted">Tailleurs et secrétaires de votre atelier</small>
        `;
    } else {
        userListHeader.innerHTML = `
            <h6 class="mb-1">Tous les Utilisateurs</h6>
            <small class="text-muted">Gestion complète des permissions</small>
        `;
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

    if (!users || users.length === 0) {
        let emptyMessage = '';
        if (currentUserData.role === 'PROPRIETAIRE') {
            emptyMessage = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-user-friends fa-2x mb-3"></i>
                    <p class="mb-2 fw-bold">Aucun employé trouvé</p>
                    <small class="text-muted">
                        Vous n'avez pas encore de tailleurs ou secrétaires dans votre atelier
                    </small>
                </div>
            `;
        } else {
            emptyMessage = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-users fa-2x mb-3"></i>
                    <p class="mb-0">Aucun utilisateur trouvé</p>
                </div>
            `;
        }
        usersList.innerHTML = emptyMessage;
        return;
    }

    users.forEach(user => {
        if (!user.id) {
            console.warn('⚠️ Utilisateur sans ID:', user);
            return;
        }

        const userElement = document.createElement('div');
        userElement.className = 'list-group-item user-card p-3';
        userElement.dataset.userId = user.id;
        
        const roleClass = getRoleBadgeClass(user.role);
        const roleText = getRoleDisplayText(user.role);

        userElement.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="flex-shrink-0">
                    <div class="user-avatar ${roleClass}">
                        ${user.prenom?.charAt(0) || ''}${user.nom?.charAt(0) || ''}
                    </div>
                </div>
                <div class="flex-grow-1 ms-3">
                    <div class="user-name fw-bold">${user.prenom || ''} ${user.nom || ''}</div>
                    <div class="user-email small text-muted">${user.email || ''}</div>
                    <span class="badge ${roleClass}">${roleText}</span>
                    ${user.actif === false ? '<span class="badge bg-secondary ms-1">Inactif</span>' : ''}
                </div>
                ${currentUserData.role === 'PROPRIETAIRE' ? `
                    <div class="flex-shrink-0">
                        <i class="fas fa-chevron-right text-muted"></i>
                    </div>
                ` : ''}
            </div>
        `;

        userElement.addEventListener('click', () => {
            console.log('👤 Sélection utilisateur:', user.id);
            selectUser(user.id);
        });
        usersList.appendChild(userElement);
    });
}

// Fonctions utilitaires pour les rôles
function getRoleBadgeClass(role) {
    const classes = {
        'SUPERADMIN': 'bg-danger',
        'PROPRIETAIRE': 'bg-primary',
        'SECRETAIRE': 'bg-info',
        'TAILLEUR': 'bg-warning'
    };
    return classes[role] || 'bg-secondary';
}

function getRoleDisplayText(role) {
    const texts = {
        'SUPERADMIN': 'Super Admin',
        'PROPRIETAIRE': 'Propriétaire', 
        'SECRETAIRE': 'Secrétaire',
        'TAILLEUR': 'Tailleur'
    };
    return texts[role] || role;
}

// Sélectionner un utilisateur
async function selectUser(userId) {
    if (!userId || userId === 'undefined') {
        console.error('❌ ID utilisateur invalide lors de la sélection');
        Common.showErrorMessage("Utilisateur invalide");
        return;
    }

    const selectedUser = allUsers.find(u => u.id == userId);
    if (!selectedUser) {
        console.error('❌ Utilisateur non trouvé dans la liste filtrée');
        Common.showErrorMessage("Utilisateur non autorisé");
        return;
    }

    // Vérification pour propriétaire
    if (currentUserData.role === 'PROPRIETAIRE') {
        if (selectedUser.role === 'PROPRIETAIRE' || selectedUser.role === 'SUPERADMIN') {
            Common.showErrorMessage("Vous ne pouvez pas gérer les permissions d'un autre propriétaire ou administrateur");
            return;
        }
    }

    selectedUserId = userId;

    // Mettre en évidence l'utilisateur sélectionné
    document.querySelectorAll('.user-card').forEach(card => {
        if (card.dataset.userId === userId) {
            card.classList.add('selected', 'border-primary');
        } else {
            card.classList.remove('selected', 'border-primary');
        }
    });

    // Afficher le nom de l'utilisateur sélectionné avec son rôle
    const selectedUserName = document.getElementById('selectedUserName');
    if (selectedUserName && selectedUser) {
        selectedUserName.innerHTML = `
            <strong>${selectedUser.prenom} ${selectedUser.nom}</strong>
            <small class="badge ${getRoleBadgeClass(selectedUser.role)} ms-2">${getRoleDisplayText(selectedUser.role)}</small>
        `;
    } else {
        selectedUserName.textContent = "Utilisateur inconnu";
    }

    // Afficher le bouton d'enregistrement
    const saveButtonContainer = document.getElementById('saveButtonContainer');
    if (saveButtonContainer) {
        saveButtonContainer.style.display = 'block';
    }

    // Charger les permissions de cet utilisateur
    await loadUserPermissions(userId);
}

// Charger toutes les permissions
async function loadAllPermissions() {
    try {
        const token = Common.getToken();
        if (!token) {
            Common.showErrorMessage("Token non disponible. Veuillez vous reconnecter.");
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
            Common.showErrorMessage("Erreur lors du chargement des permissions");
        }
    } catch (error) {
        console.error('Erreur:', error);
        Common.showErrorMessage('Une erreur est survenue lors du chargement des permissions');
    }
}

// Charger les permissions d'un utilisateur
async function loadUserPermissions(userId) {
    try {
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.error('❌ ID utilisateur invalide:', userId);
            Common.showErrorMessage("ID utilisateur invalide");
            return;
        }

        const token = Common.getToken();
        if (!token) {
            Common.showErrorMessage("Token non disponible. Veuillez vous reconnecter.");
            return;
        }

        console.log('📡 Chargement permissions pour utilisateur:', userId);

        const response = await fetch(`${API_BASE_URL}/api/admin/utilisateurs/${userId}/permissions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const userPermissions = await response.json();
            selectedUserPermissions = new Set(userPermissions.map(p => p.id));

            console.log('✅ Permissions utilisateur chargées:', userPermissions.length);
            renderUserPermissionsTable();

        } else {
            if (await handleApiError(response, "chargement permissions utilisateur")) return;

            if (response.status === 400) {
                Common.showErrorMessage("Requête invalide. Vérifiez l'ID utilisateur.");
            } else {
                Common.showErrorMessage("Erreur lors du chargement des permissions de l'utilisateur");
            }
        }
    } catch (error) {
        console.error('❌ Erreur chargement permissions:', error);
        Common.showErrorMessage('Une erreur est survenue lors du chargement des permissions');
    }
}

// Afficher les permissions dans des tableaux séparés par module
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

    let modulesHTML = '';

    // Parcourir chaque module et créer un tableau séparé
    Object.keys(permissionsByModule).sort().forEach(module => {
        const modulePermissions = permissionsByModule[module];
        const moduleDisplayName = getModuleDisplayName(module);

        let tableHTML = `
            <div class="card mb-4">
                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 fw-bold">
                        <i class="fas fa-folder me-2"></i>Module ${moduleDisplayName}
                    </h6>
                    <span class="badge bg-primary">${modulePermissions.length} permission(s)</span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-sm table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th width="40" class="text-center">
                                        <div class="form-check">
                                            <input class="form-check-input module-select-all" 
                                                   type="checkbox" 
                                                   data-module="${module}">
                                        </div>
                                    </th>
                                    <th width="150">Action</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        modulePermissions.forEach(permission => {
            const isChecked = Array.from(selectedUserPermissions).some(id => id === permission.id);
            const action = permission.code.split('_')[1] || permission.code;

            tableHTML += `
                <tr class="permission-row ${isChecked ? 'table-success' : ''}">
                    <td class="text-center">
                        <div class="form-check">
                            <input class="form-check-input permission-checkbox" 
                                   type="checkbox" 
                                   value="${permission.id}"
                                   ${isChecked ? 'checked' : ''}
                                   data-permission-id="${permission.id}"
                                   data-module="${module}">
                        </div>
                    </td>
                    <td>
                        <span class="fw-bold text-uppercase small">${action}</span>
                    </td>
                    <td class="small">${permission.description}</td>
                </tr>
            `;
        });

        tableHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        modulesHTML += tableHTML;
    });

    // Ajouter le panneau de statistiques en bas
    const statsHTML = `
        <div class="card border-primary">
            <div class="card-body">
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
        </div>
    `;

    container.innerHTML = modulesHTML + statsHTML;

    // Ajouter les écouteurs d'événements
    addTableEventListeners();
    updateSelectedCount();
}

// Obtenir le nom d'affichage du module
function getModuleDisplayName(module) {
    const moduleNames = {
        'MESURE': 'Mesure',
        'CLIENT': 'Client',
        'COMMANDE': 'Commande',
        'ARTICLE': 'Article',
        'PAIEMENT': 'Paiement',
        'UTILISATEUR': 'Utilisateur',
        'RAPPORT': 'Rapport'
    };
    return moduleNames[module] || module;
}

// Ajouter les écouteurs pour le tableau
function addTableEventListeners() {
    // Cases à cocher "Sélectionner tout" pour chaque module
    document.querySelectorAll('.module-select-all').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const module = this.dataset.module;
            const moduleCheckboxes = document.querySelectorAll(`.permission-checkbox[data-module="${module}"]`);
            
            moduleCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
                const row = checkbox.closest('tr');
                if (this.checked) {
                    row.classList.add('table-success');
                } else {
                    row.classList.remove('table-success');
                }
            });
            updateSelectedCount();
            updateModuleSelectAllCheckboxes();
        });
    });

    // Cases à cocher individuelles
    document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            updateSelectedCount();
            updateModuleSelectAllCheckboxes();

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

// Mettre à jour les cases "Sélectionner tout" pour chaque module
function updateModuleSelectAllCheckboxes() {
    document.querySelectorAll('.module-select-all').forEach(moduleCheckbox => {
        const module = moduleCheckbox.dataset.module;
        const moduleCheckboxes = document.querySelectorAll(`.permission-checkbox[data-module="${module}"]`);
        
        if (moduleCheckboxes.length > 0) {
            const allChecked = Array.from(moduleCheckboxes).every(checkbox => checkbox.checked);
            const someChecked = Array.from(moduleCheckboxes).some(checkbox => checkbox.checked);

            moduleCheckbox.checked = allChecked;
            moduleCheckbox.indeterminate = someChecked && !allChecked;
        }
    });
}

// Mettre à jour le compteur de permissions sélectionnées
function updateSelectedCount() {
    const selectedCount = document.querySelectorAll('.permission-checkbox:checked').length;
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = selectedCount;
    }
}

// Tout désélectionner
function clearAllSelections() {
    document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        const row = checkbox.closest('tr');
        row.classList.remove('table-success');
    });
    
    document.querySelectorAll('.module-select-all').forEach(checkbox => {
        checkbox.checked = false;
        checkbox.indeterminate = false;
    });
    
    updateSelectedCount();
}

// Récupérer les permissions sélectionnées depuis le tableau
function getSelectedPermissionsFromTable() {
    const selectedPermissions = new Set();
    document.querySelectorAll('.permission-checkbox:checked').forEach(checkbox => {
        selectedPermissions.add(checkbox.value);
    });
    return selectedPermissions;
}

// Enregistrer les permissions modifiées
async function savePermissions() {
    console.log("🔍 Début savePermissions");

    if (!selectedUserId) {
        Common.showErrorMessage("Veuillez sélectionner un utilisateur");
        return;
    }

    const token = Common.getToken();
    if (!token) {
        Common.showErrorMessage("Token non disponible. Veuillez vous reconnecter.");
        return;
    }

    // Récupérer les permissions depuis le tableau
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
                Common.showSuccessMessage("Les permissions ont été mises à jour avec succès !");

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

                Common.showErrorMessage(errorMsg);
            }
        } catch (error) {
            console.error('💥 Erreur réseau:', error);
            Common.showErrorMessage('Erreur de connexion: ' + error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }
}

// Afficher le message d'information pour le propriétaire
function showProprietaireInfoMessage() {
    const infoMessage = document.createElement('div');
    infoMessage.className = 'alert alert-info mb-4';
    infoMessage.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-info-circle fa-lg me-3"></i>
            <div>
                <p class="mb-0">
                    Cette interface vous permet de gérer les permissions de vos tailleurs et secrétaires.
                </p>
            </div>
        </div>
    `;
    
    // Insérer le message au début du contenu principal
    const cardBody = document.querySelector('.card-body');
    if (cardBody) {
        cardBody.insertBefore(infoMessage, cardBody.firstChild);
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Initialisation de la page permissions');

    // Vérifier que SweetAlert2 est disponible
    if (typeof Swal === 'undefined') {
        console.warn('⚠️ SweetAlert2 non disponible, utilisation des alertes natives');
    }

    // Vérifier les permissions ADMIN
    if (!checkAdminPermission()) {
        return;
    }

    // Récupérer les données utilisateur au chargement
    currentUserData = Common.getUserData();

    // Afficher le message d'information si c'est un propriétaire
    if (currentUserData.role === 'PROPRIETAIRE') {
        showProprietaireInfoMessage();
        
        // Adapter les titres pour le propriétaire
        const pageTitle = document.querySelector('h1, .page-title');
        if (pageTitle) {
            pageTitle.textContent = 'Gestion des Permissions - Mes Employés';
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

    // Recherche d'utilisateurs
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', function (e) {
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

    // Masquer le bouton "Ajouter une permission" si non SUPERADMIN
    if (currentUserData.role !== 'SUPERADMIN') {
        const addPermissionBtn = document.querySelector('[data-bs-target="#ajouterPermissionModal"]');
        if (addPermissionBtn) {
            addPermissionBtn.style.display = 'none';
        }
    }
});

// Exposer les fonctions globalement pour les événements onclick
window.clearAllSelections = clearAllSelections;
window.savePermissions = savePermissions;