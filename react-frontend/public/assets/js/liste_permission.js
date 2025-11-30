// Configuration
const API_BASE_URL = "http://localhost:8081";
let allPermissions = [];
let currentPage = 1;
const itemsPerPage = 10;

// Fonctions d'authentification
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
    };
}

function checkPermission() {
    const userData = getUserData();
    const allowedRoles = ['SUPERADMIN', 'PROPRIETAIRE'];
    
    if (!allowedRoles.includes(userData.role)) {
        errorMessage("Accès refusé. Cette fonctionnalité est réservée aux administrateurs.");
        window.location.href = 'home.html';
        return false;
    }
    return true;
}

// Fonctions de message
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

// Fonction pour charger toutes les permissions
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
            renderPermissionsTable();
            updateCounts();
        } else {
            if (response.status === 401) {
                logout();
                return;
            }
            errorMessage("Erreur lors du chargement des permissions");
        }
    } catch (error) {
        console.error('Erreur:', error);
        errorMessage('Une erreur est survenue lors du chargement des permissions');
    }
}

// Fonction pour afficher les permissions dans le tableau
function renderPermissionsTable() {
    const tbody = document.getElementById('permissionsTableBody');
    if (!tbody) {
        console.error('❌ Element #permissionsTableBody non trouvé');
        return;
    }

    tbody.innerHTML = '';

    if (allPermissions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-4">
                    <i class="fas fa-inbox fa-2x mb-3"></i>
                    <p class="mb-0">Aucune permission disponible</p>
                </td>
            </tr>
        `;
        return;
    }

    // Filtrer et paginer les permissions
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filteredPermissions = allPermissions.filter(permission => 
        permission.code.toLowerCase().includes(searchTerm) ||
        permission.description.toLowerCase().includes(searchTerm)
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPermissions = filteredPermissions.slice(startIndex, endIndex);

    paginatedPermissions.forEach(permission => {
        const module = permission.code.split('_')[0];
        
        const row = document.createElement('tr');
        row.className = 'permission-row';
        row.innerHTML = `
            <td>
                <strong class="text-primary">${permission.code}</strong>
            </td>
            <td>${permission.description}</td>
            <td>
                <span class="badge bg-primary">${module}</span>
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-warning me-1 btn-modifier" 
                        title="Modifier" 
                        onclick="editPermission('${permission.id}')">
                    <i class="bi bi-pencil"></i> 
                </button>
                <button class="btn btn-sm btn-danger me-1 btn-supprimer" 
                        title="Supprimer" 
                        onclick="deletePermission('${permission.id}')">
                    <i class="bi bi-trash"></i> 
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Mettre à jour la pagination
    renderPagination(filteredPermissions.length);
}

// Fonction pour la pagination
function renderPagination(totalItems) {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    let paginationHTML = '';
    
    // Bouton Précédent
    if (currentPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Précédent</a>
            </li>
        `;
    } else {
        paginationHTML += `
            <li class="page-item disabled">
                <a class="page-link" href="#">Précédent</a>
            </li>
        `;
    }

    // Pages
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `
                <li class="page-item active">
                    <a class="page-link" href="#">${i}</a>
                </li>
            `;
        } else {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `;
        }
    }

    // Bouton Suivant
    if (currentPage < totalPages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Suivant</a>
            </li>
        `;
    } else {
        paginationHTML += `
            <li class="page-item disabled">
                <a class="page-link" href="#">Suivant</a>
            </li>
        `;
    }

    paginationContainer.innerHTML = paginationHTML;
}

// Fonction pour changer de page
function changePage(page) {
    currentPage = page;
    renderPermissionsTable();
}

// Fonction pour mettre à jour les compteurs
function updateCounts() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filteredPermissions = allPermissions.filter(permission => 
        permission.code.toLowerCase().includes(searchTerm) ||
        permission.description.toLowerCase().includes(searchTerm)
    );
    
    document.getElementById('displayCount').textContent = filteredPermissions.length;
    document.getElementById('totalCount').textContent = allPermissions.length;
}

// Fonction pour créer une permission
// Fonction pour créer une permission
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

    // Afficher un loader
    const submitBtn = document.getElementById('submitCreatePermission');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Création...';

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
            const result = await response.json();
            console.log("✅ Permission créée:", result);
            
            successMessage(`La permission "${code}" a été créée avec succès !`);

            // Fermer le modal et réinitialiser
            const modal = bootstrap.Modal.getInstance(document.getElementById('ajouterPermissionModal'));
            if (modal) {
                modal.hide();
            }

            // 🧹 Correction du voile gris persistant
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            document.getElementById('createPermissionForm').reset();

            // Recharger les permissions
            await loadAllPermissions();

        } else {
            const errorData = await response.json();
            if (response.status === 401) {
                logout();
                return;
            }
            errorMessage(errorData.message || errorData.error || "Erreur lors de la création de la permission");
        }
    } catch (error) {
        console.error('Erreur:', error);
        errorMessage('Une erreur est survenue lors de la création de la permission: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Fonction pour modifier une permission
async function editPermission(permissionId) {
    try {
        const token = getToken();
        if (!token) {
            errorMessage("Token non disponible. Veuillez vous reconnecter.");
            return;
        }

        // Récupérer les détails de la permission
        const response = await fetch(`${API_BASE_URL}/api/admin/permissions/${permissionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const permission = await response.json();
            
            // Afficher le modal de modification avec SweetAlert2
            const { value: formValues } = await Swal.fire({
                title: 'Modifier la permission',
                html: `
                    <input id="swal-code" class="swal2-input" placeholder="Code" value="${permission.code}" required>
                    <textarea id="swal-description" class="swal2-textarea" placeholder="Description" required>${permission.description}</textarea>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Modifier',
                cancelButtonText: 'Annuler',
                preConfirm: () => {
                    const code = document.getElementById('swal-code').value.trim();
                    const description = document.getElementById('swal-description').value.trim();
                    
                    if (!code || !description) {
                        Swal.showValidationMessage('Veuillez remplir tous les champs');
                        return false;
                    }
                    
                    if (!/^[A-Z_]+$/.test(code)) {
                        Swal.showValidationMessage('Le code doit contenir uniquement des lettres majuscules et des underscores');
                        return false;
                    }
                    
                    return { code, description };
                }
            });

            if (formValues) {
                await updatePermission(permissionId, formValues.code, formValues.description);
            }

        } else {
            if (response.status === 401) {
                logout();
                return;
            }
            errorMessage("Erreur lors du chargement des détails de la permission");
        }
    } catch (error) {
        console.error('Erreur:', error);
        errorMessage('Une erreur est survenue lors du chargement des détails de la permission');
    }
}

// Fonction pour mettre à jour une permission
async function updatePermission(permissionId, code, description) {
    const token = getToken();
    if (!token) {
        errorMessage("Token non disponible. Veuillez vous reconnecter.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/permissions/${permissionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                code, 
                description 
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log("✅ Permission modifiée:", result);
            
            successMessage(`La permission "${code}" a été modifiée avec succès !`);

            // Recharger les permissions
            await loadAllPermissions();

        } else {
            const errorData = await response.json();
            if (response.status === 401) {
                logout();
                return;
            }
            errorMessage(errorData.message || errorData.error || "Erreur lors de la modification de la permission");
        }
    } catch (error) {
        console.error('Erreur:', error);
        errorMessage('Une erreur est survenue lors de la modification de la permission: ' + error.message);
    }
}

// Fonction pour supprimer une permission
async function deletePermission(permissionId) {
    const permission = allPermissions.find(p => p.id === permissionId);
    if (!permission) {
        errorMessage("Permission non trouvée");
        return;
    }

    const result = await Swal.fire({
        title: 'Êtes-vous sûr ?',
        text: `Voulez-vous vraiment supprimer la permission "${permission.code}" ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Oui, supprimer !',
        cancelButtonText: 'Annuler'
    });

    if (!result.isConfirmed) {
        return;
    }

    try {
        const token = getToken();
        if (!token) {
            errorMessage("Token non disponible. Veuillez vous reconnecter.");
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/admin/permissions/${permissionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            successMessage(`La permission "${permission.code}" a été supprimée avec succès !`);
            await loadAllPermissions();
        } else {
            const errorData = await response.json();
            if (response.status === 401) {
                logout();
                return;
            }
            errorMessage(errorData.message || errorData.error || "Erreur lors de la suppression de la permission");
        }
    } catch (error) {
        console.error('Erreur:', error);
        errorMessage('Une erreur est survenue lors de la suppression de la permission');
    }
}

// Fonction de déconnexion
function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userData");
    window.location.href = "index.html";
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de la page liste des permissions');

    // Vérifier les permissions
    if (!checkPermission()) {
        return;
    }

    // Masquer le bouton "Ajouter une permission" si non SUPERADMIN
    const userData = getUserData();
    if (userData.role !== 'SUPERADMIN') {
        const addPermissionBtn = document.querySelector('[data-bs-target="#ajouterPermissionModal"]');
        if (addPermissionBtn) {
            addPermissionBtn.style.display = 'none';
        }
    }

    // Charger les permissions
    loadAllPermissions();

    // Événements
    const submitCreatePermission = document.getElementById('submitCreatePermission');
    if (submitCreatePermission) {
        submitCreatePermission.addEventListener('click', createPermission);
    }

    // Recherche en temps réel
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentPage = 1;
            renderPermissionsTable();
            updateCounts();
        });
    }

    // Permettre la soumission du formulaire avec Entrée
    const createForm = document.getElementById('createPermissionForm');
    if (createForm) {
        createForm.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                createPermission();
            }
        });
    }
});