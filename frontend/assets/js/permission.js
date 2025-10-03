
    const API_BASE_URL = "http://localhost:8081";
    const API_PERMISSIONS = `${API_BASE_URL}/api/admin/permissions`;
    const API_USER_PERMISSIONS = `${API_BASE_URL}/api/admin/utilisateurs`;

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

    // Fonction pour vérifier les permissions (seul SUPERADMIN peut accéder)
    function checkPermission() {
        const userData = getUserData();
        if (userData.role !== 'SUPERADMIN') {
            Swal.fire({
                icon: "error",
                title: "Accès refusé",
                text: "Cette fonctionnalité est réservée aux administrateurs.",
                confirmButtonColor: "#d33",
            }).then(() => {
                window.location.href = 'home.html'; 
            });
            return false;
        }
        return true;
    }

    // Fonction pour afficher les messages de succès
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

    // Fonction pour afficher les messages d'erreur
    function errorMessage(message) {
        Swal.fire({
            icon: "error",
            title: "Erreur",
            text: message,
            confirmButtonColor: "#d33",
        });
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
        usersList.innerHTML = '';

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'list-group-item user-card p-3';
            userElement.dataset.userId = user.id;
            userElement.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="flex-shrink-0">
                        <div class="user-avatar">
                            ${user.prenom.charAt(0)}${user.nom.charAt(0)}
                        </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <div class="user-name fw-bold">${user.prenom} ${user.nom}</div>
                        <div class="user-email small text-muted">${user.email}</div>
                        <span class="badge bg-secondary">${user.role}</span>
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
        document.getElementById('selectedUserName').textContent = `${selectedUser.prenom} ${selectedUser.nom}`;

        // Afficher le bouton d'enregistrement
        document.getElementById('saveButtonContainer').style.display = 'block';

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
                renderPermissions(userPermissions);
            } else {
                if (await handleApiError(response, "chargement permissions utilisateur")) return;
                errorMessage("Erreur lors du chargement des permissions de l'utilisateur");
            }
        } catch (error) {
            console.error('Erreur:', error);
            errorMessage('Une erreur est survenue lors du chargement des permissions');
        }
    }

    // Afficher les permissions avec cases à cocher
    function renderPermissions(userPermissions) {
        const container = document.getElementById('permissionsList');
        container.innerHTML = '';

        // Grouper les permissions par module
        const permissionsByModule = {};
        allPermissions.forEach(permission => {
            const module = permission.code.split('_')[0];
            if (!permissionsByModule[module]) {
                permissionsByModule[module] = [];
            }
            permissionsByModule[module].push(permission);
        });

        // Créer les éléments pour chaque module
        for (const module in permissionsByModule) {
            // Titre du module
            const moduleTitle = document.createElement('div');
            moduleTitle.className = 'module-title';
            moduleTitle.textContent = `Module ${module}`;
            container.appendChild(moduleTitle);

            // Permissions du module
            permissionsByModule[module].forEach(permission => {
                const isChecked = Array.from(selectedUserPermissions).some(id => id === permission.id);

                const permissionItem = document.createElement('div');
                permissionItem.className = 'permission-item';
                permissionItem.innerHTML = `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" 
                               value="${permission.id}" 
                               id="perm-${permission.id}" 
                               ${isChecked ? 'checked' : ''}>
                        <label class="form-check-label" for="perm-${permission.id}">
                            ${permission.code} - ${permission.description}
                        </label>
                    </div>
                `;

                container.appendChild(permissionItem);
            });
        }
    }

    // Enregistrer les permissions modifiées
    async function savePermissions() {
        if (!selectedUserId) {
            errorMessage("Veuillez sélectionner un utilisateur");
            return;
        }

        const token = getToken();
        if (!token) {
            errorMessage("Token non disponible. Veuillez vous reconnecter.");
            return;
        }

       // Récupérer les IDs des permissions cochées
		const selectedPermissionIds = new Set();
		document.querySelectorAll('#permissionsList input[type="checkbox"]:checked').forEach(checkbox => {
			selectedPermissionIds.add(checkbox.value); // garder en string (UUID)
		});


        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/utilisateurs/${selectedUserId}/permissions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(Array.from(selectedPermissionIds))
            });

            if (response.ok) {
                successMessage('Les permissions ont été mises à jour avec succès');
            } else {
                if (await handleApiError(response, "sauvegarde permissions")) return;
                errorMessage("Erreur lors de la mise à jour des permissions");
            }
        } catch (error) {
            console.error('Erreur:', error);
            errorMessage('Une erreur est survenue lors de la mise à jour des permissions');
        }
    }

   // Créer une nouvelle permission
async function createPermission() {
    const token = getToken();
    if (!token) {
        errorMessage("Token non disponible. Veuillez vous reconnecter.");
        return;
    }

    const code = document.getElementById('permissionCode').value.trim();
    const description = document.getElementById('permissionDescription').value.trim();

    if (!code) {
        errorMessage("Le code de la permission est obligatoire");
        return;
    }

    if (!description) {
        errorMessage("La description de la permission est obligatoire");
        return;
    }

    // Valider le format du code
    if (!/^[A-Z_]+$/.test(code)) {
        errorMessage("Le code doit contenir uniquement des lettres majuscules et des underscores");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/permissions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code, description })
        });

        if (response.ok) {
            successMessage('La permission a été créée avec succès');
            // Fermer le modal
            bootstrap.Modal.getInstance(document.getElementById('ajouterPermissionModal')).hide();
            // Réinitialiser le formulaire
            document.getElementById('createPermissionForm').reset();
            // Recharger la liste des permissions
            loadAllPermissions();
        } else {
            const errorData = await response.json();
            if (await handleApiError(response, "création permission")) return;
            errorMessage(errorData.error || "Erreur lors de la création de la permission");
        }
    } catch (error) {
        console.error('Erreur:', error);
        errorMessage('Une erreur est survenue lors de la création de la permission');
    }
}

    // Initialisation
    document.addEventListener('DOMContentLoaded', function() {
        // Vérifier les permissions
        if (!checkPermission()) {
            return;
        }

        // Charger les données
        loadUsers();
        loadAllPermissions();

        // Événements
        document.getElementById('savePermissions').addEventListener('click', savePermissions);
        document.getElementById('submitCreatePermission').addEventListener('click', createPermission);

        // Recherche d'utilisateurs
        document.getElementById('userSearch').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const userElements = document.querySelectorAll('.user-card');
            
            userElements.forEach(element => {
                const userName = element.querySelector('.user-name').textContent.toLowerCase();
                const userEmail = element.querySelector('.user-email').textContent.toLowerCase();
                
                if (userName.includes(searchTerm) || userEmail.includes(searchTerm)) {
                    element.style.display = 'flex';
                } else {
                    element.style.display = 'none';
                }
            });
        });
    });
