// affectation.js - Version avec DEBUG
let selectedClients = new Map();
let currentAtelierId = null;
let currentUserRole = null;
let currentUserId = null;
let overdueOnlyMode = false;

const apiAffectations = "http://localhost:8081/api/affectations";

// ✅ UTILISER LES FONCTIONS COMMUNES
function getToken() {
    return window.Common ? window.Common.getToken() : null;
}

function getUserData() {
    return window.Common ? window.Common.getUserData() : {};
}

function showSuccess(message) {
    if (window.Common) {
        window.Common.showSuccessMessage(message);
    } else {
        alert('✅ ' + message);
    }
}

function showError(message) {
    if (window.Common) {
        window.Common.showErrorMessage(message);
    } else {
        alert('❌ ' + message);
    }
}
// Initialisation
function initAffectation() {
    // ✅ UTILISER Common.getUserData() au lieu de la version dupliquée
    const userData = getUserData();
    currentUserRole = userData.role;
    currentUserId = userData.userId;
    currentAtelierId = userData.atelierId;

    console.log('🚀 Initialisation affectation - Role:', currentUserRole, 'User:', currentUserId);

    // Vérifier les permissions
    if (!hasRequiredPermissions()) {
        window.location.href = 'home.html';
        return;
    }

    // Masquer/montrer les sections selon le rôle
    toggleSectionsByRole();

    // Initialiser les composants
    initializeComponents();
    setupEventListeners();
    applyUrlFilters();

    // Charger les données
    if (canCreateAffectation()) {
        loadTailleurs();
        loadClientsAvecMesures();
    }
    
    loadAffectations();
}

function applyUrlFilters() {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get('retard') || params.get('overdue') || '').toLowerCase();
    overdueOnlyMode = raw === '1' || raw === 'true' || raw === 'yes';

    if (!overdueOnlyMode) return;

    const filterStatut = document.getElementById('filterStatutAffectation');
    if (filterStatut) {
        filterStatut.value = 'EN_COURS';
    }
}

function isAffectationOverdue(affectation) {
    if (!affectation?.dateEcheance) return false;
    if (['ANNULE', 'TERMINE', 'VALIDE'].includes(affectation.statut)) return false;

    const deadline = new Date(affectation.dateEcheance);
    if (Number.isNaN(deadline.getTime())) return false;

    deadline.setHours(23, 59, 59, 999);
    return deadline.getTime() < Date.now();
}


// ✅ SOLUTION ULTRA SIMPLE - Tout le monde a accès
function hasRequiredPermissions() {
    console.log('🔐 Vérification permissions pour:', currentUserRole);
    console.log('📋 Permissions disponibles:', getUserData().permissions);
    
    // ✅ TOUT LE MONDE a accès à la page affectation
    return true;
}

// Permissions
function canCreateAffectation() {
    return currentUserRole === 'PROPRIETAIRE' || currentUserRole === 'SECRETAIRE';
}

function canCancelAffectation() {
    return currentUserRole === 'PROPRIETAIRE' || currentUserRole === 'SECRETAIRE' || currentUserRole === 'SUPERADMIN';
}

// Masquer/montrer les sections selon le rôle
function toggleSectionsByRole() {
    const creationSection = document.getElementById('creationSection');
    const suiviSection = document.getElementById('suiviSection');
    const roleInfo = document.getElementById('roleInfo');

    if (creationSection) {
        creationSection.style.display = canCreateAffectation() ? 'block' : 'none';
    }

    if (suiviSection) {
        suiviSection.style.display = 'block'; // Tout le monde peut voir le suivi
    }

    if (roleInfo) {
        roleInfo.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-user-tag"></i> 
                Connecté en tant que <strong>${currentUserRole}</strong>
                ${currentUserRole === 'TAILLEUR' ? ' - Vous voyez seulement vos affectations' : ''}
            </div>
        `;
    }
}

// Initialisation des composants
function initializeComponents() {
    // Date d'échéance par défaut : 7 jours
    const dateEcheance = new Date();
    dateEcheance.setDate(dateEcheance.getDate() + 7);
    const dateInput = document.getElementById('dateEcheance');
    if (dateInput) {
        dateInput.value = dateEcheance.toISOString().split('T')[0];
    }
}

// Configuration des événements
function setupEventListeners() {
    // Recherche et filtres clients
    const searchInput = document.getElementById('searchClient');
    if (searchInput) {
        searchInput.addEventListener('input', filterAndDisplayClients);
    }

    const filterType = document.getElementById('filterTypeVetement');
    if (filterType) {
        filterType.addEventListener('change', filterAndDisplayClients);
    }

    const btnClearSearch = document.getElementById('btnClearSearch');
    if (btnClearSearch) {
        btnClearSearch.addEventListener('click', () => {
            document.getElementById('searchClient').value = '';
            filterAndDisplayClients();
        });
    }

    // Soumission du formulaire
    const form = document.getElementById('formAffectation');
    if (form) {
        form.addEventListener('submit', confirmAffectation);
    }

    // Filtres affectations
    const filterStatut = document.getElementById('filterStatutAffectation');
    if (filterStatut) {
        filterStatut.addEventListener('change', filterAffectations);
    }

    const filterTailleur = document.getElementById('filterTailleurAffectation');
    if (filterTailleur) {
        filterTailleur.addEventListener('change', filterAffectations);
    }

    const btnResetFilters = document.getElementById('btnResetFiltersAffectation');
    if (btnResetFilters) {
        btnResetFilters.addEventListener('click', resetFilters);
    }
}

// CHARGEMENT DES DONNÉES
async function loadTailleurs() {
    try {
        const token = getToken();
        const response = await fetch(`${apiAffectations}/formulaire-data?atelierId=${currentAtelierId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

        const data = await response.json();
        if (data.success && data.data && data.data.tailleurs) {
            displayTailleurs(data.data.tailleurs);
        }
    } catch (error) {
        console.error("Erreur chargement tailleurs:", error);
        showError("Erreur lors du chargement des tailleurs");
    }
}

async function loadClientsAvecMesures() {
    try {
        const token = getToken();
        const response = await fetch(`${apiAffectations}/formulaire-data?atelierId=${currentAtelierId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

        const data = await response.json();
        if (data.success && data.data && data.data.clients) {
            window.clientsDisponibles = data.data.clients;
            filterAndDisplayClients();
        }
    } catch (error) {
        console.error("Erreur chargement clients:", error);
        showError("Erreur lors du chargement des clients");
    }
}

async function loadAffectations() {
    try {
        const token = getToken();
        
        // Construire l'URL avec filtres
        let url = `${apiAffectations}?atelierId=${currentAtelierId}`;
        const filterStatut = document.getElementById('filterStatutAffectation')?.value;
        const filterTailleur = document.getElementById('filterTailleurAffectation')?.value;
        
        if (filterStatut) url += `&statut=${filterStatut}`;
        if (!filterStatut && overdueOnlyMode) url += `&statut=EN_COURS`;
        if (filterTailleur) url += `&tailleurId=${filterTailleur}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "X-User-Id": currentUserId,
                "X-User-Role": currentUserRole
            },
        });

        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

        const data = await response.json();
        const affectations = Array.isArray(data.data) ? data.data : [];
        const filtered = overdueOnlyMode ? affectations.filter(isAffectationOverdue) : affectations;
        displayAffectations(filtered);
    } catch (error) {
        console.error("Erreur chargement affectations:", error);
        showError("Erreur lors du chargement des affectations");
    }
}

// AFFICHAGE DES DONNÉES
function displayTailleurs(tailleurs) {
    const selectTailleur = document.getElementById('selectTailleur');
    const filterTailleur = document.getElementById('filterTailleurAffectation');
    
    if (selectTailleur) {
        selectTailleur.innerHTML = '<option value="">Choisir un tailleur...</option>';
        tailleurs.forEach(tailleur => {
            const option = document.createElement('option');
            option.value = tailleur.id;
            option.textContent = `${tailleur.prenom} ${tailleur.nom}`;
            selectTailleur.appendChild(option);
        });
    }

    if (filterTailleur) {
        filterTailleur.innerHTML = '<option value="">Tous les tailleurs</option>';
        tailleurs.forEach(tailleur => {
            const option = document.createElement('option');
            option.value = tailleur.id;
            option.textContent = `${tailleur.prenom} ${tailleur.nom}`;
            filterTailleur.appendChild(option);
        });
    }
}

function filterAndDisplayClients() {
    const searchTerm = document.getElementById('searchClient')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('filterTypeVetement')?.value || '';
    
    if (!window.clientsDisponibles) return;
    
    const filteredClients = window.clientsDisponibles.filter(client => {
        const matchesSearch = !searchTerm || 
            (client.nom && client.nom.toLowerCase().includes(searchTerm)) ||
            (client.prenom && client.prenom.toLowerCase().includes(searchTerm));
        
        const matchesType = !typeFilter || 
            (client.mesures && client.mesures.some(m => m.typeVetement === typeFilter));
        
        return matchesSearch && matchesType;
    });
    
    renderClientsList(filteredClients);
}

function renderClientsList(clients = []) {
    const container = document.getElementById('clientsList');
    const countElement = document.getElementById('clientsCount');
    
    if (!container || !countElement) return;

    // Filtrer les clients qui ont au moins une mesure non affectée
    const clientsAvecMesures = clients.filter(client => 
        client.mesures && client.mesures.length > 0
    );
    
    countElement.textContent = `${clientsAvecMesures.length} clients trouvés`;
    
    if (clientsAvecMesures.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-4">
                <i class="fas fa-search fa-2x text-muted mb-3"></i>
                <p class="text-muted">Aucun client trouvé avec des mesures disponibles</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = clientsAvecMesures.map(client => {
        const mesures = client.mesures || [];
        const isSelected = selectedClients.has(client.id);
        
        const clientPhotoUrl = client.photo 
            ? `http://localhost:8081${client.photo}` 
            : null;

        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card client-card ${isSelected ? 'selected border-primary' : ''}" 
                     onclick="toggleClientSelection('${client.id}')">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-2">
                            <div class="flex-shrink-0">
                                ${clientPhotoUrl ? `
                                    <img src="${clientPhotoUrl}" 
                                         alt="${client.prenom} ${client.nom}"
                                         class="rounded-circle"
                                         style="width: 40px; height: 40px; object-fit: cover;">
                                ` : `
                                    <div class="rounded-circle bg-light text-center d-flex align-items-center justify-content-center" 
                                         style="width: 40px; height: 40px;">
                                        <i class="bx bx-user text-muted"></i>
                                    </div>
                                `}
                            </div>
                            <div class="flex-grow-1 ms-2">
                                <h6 class="mb-0 fw-bold" style="font-size: 0.9rem;">${client.prenom} ${client.nom}</h6>
                                <small class="text-muted">${client.contact || 'Non renseigné'}</small>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" 
                                       ${isSelected ? 'checked' : ''}
                                       onchange="toggleClientSelection('${client.id}')">
                            </div>
                        </div>
                        
                        <div class="mb-2">
                            <small class="text-muted">
                                <i class="bx bx-ruler me-1"></i>
                                ${mesures.length} mesure(s) disponible(s)
                            </small>
                        </div>
                        
                        ${mesures.map(mesure => `
                            <div class="small text-muted border-top pt-1 mt-1">
                                <i class="bx bx-t-shirt me-1"></i>${mesure.typeVetement}
                                <br><i class="bx bx-calendar me-1"></i>
                                ${new Date(mesure.dateMesure).toLocaleDateString('fr-FR')}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// GESTION SÉLECTION CLIENTS
function toggleClientSelection(clientId) {
    if (!canCreateAffectation()) return;

    const client = window.clientsDisponibles.find(c => c.id === clientId);
    if (!client) return;

    if (selectedClients.has(clientId)) {
        selectedClients.delete(clientId);
    } else {
        // Prendre la première mesure disponible
        const mesureDisponible = client.mesures && client.mesures.length > 0 ? client.mesures[0] : null;
        if (mesureDisponible) {
            selectedClients.set(clientId, {
                clientId: clientId,
                mesureId: mesureDisponible.id,
                prixTailleur: 5000,
                clientNom: `${client.prenom} ${client.nom}`,
                typeVetement: mesureDisponible.typeVetement
            });
        }
    }
    
    filterAndDisplayClients();
    updateSelectionSummary();
}

function updatePrix(clientId, prix) {
    if (selectedClients.has(clientId)) {
        const selectionItem = selectedClients.get(clientId);
        selectionItem.prixTailleur = parseInt(prix) || 0;
        selectedClients.set(clientId, selectionItem);
        updateSelectionSummary();
    }
}

function removeFromSelection(clientId) {
    selectedClients.delete(clientId);
    filterAndDisplayClients();
    updateSelectionSummary();
}

function updateSelectionSummary() {
    const summaryElement = document.getElementById('selectionSummary');
    const summaryContent = document.getElementById('summaryContent');
    
    if (!summaryElement || !summaryContent) return;
    
    if (selectedClients.size === 0) {
        summaryElement.style.display = 'none';
        return;
    }
    
    let totalPrix = 0;
    
    let panierHTML = `
        <div class="table-responsive">
            <table class="table table-sm table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Client</th>
                        <th>Type vêtement</th>
                        <th>Prix tailleur</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    selectedClients.forEach((item, clientId) => {
        totalPrix += item.prixTailleur;
        
        panierHTML += `
            <tr>
                <td><strong>${item.clientNom}</strong></td>
                <td><span class="badge bg-info">${item.typeVetement}</span></td>
                <td>
                    <div class="input-group input-group-sm" style="width: 150px;">
                        <input type="number" class="form-control form-control-sm" 
                               value="${item.prixTailleur}"
                               onchange="updatePrix('${clientId}', this.value)"
                               min="1000" step="500">
                        <span class="input-group-text">FCFA</span>
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" 
                            onclick="removeFromSelection('${clientId}')"
                            title="Retirer du panier">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    panierHTML += `
                </tbody>
                <tfoot class="table-primary">
                    <tr>
                        <td colspan="2" class="text-end fw-bold">Total:</td>
                        <td class="fw-bold">${totalPrix.toLocaleString()} FCFA</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    summaryContent.innerHTML = panierHTML;
    summaryElement.style.display = 'block';
}

// SOUMISSION DU FORMULAIRE
async function confirmAffectation(event) {
    if (event) event.preventDefault();
    
    if (!canCreateAffectation()) {
        showError("❌ Seuls le propriétaire et le secrétaire peuvent créer des affectations");
        return;
    }
    
    const tailleurId = document.getElementById('selectTailleur').value;
    const dateEcheance = document.getElementById('dateEcheance').value;
    
    if (!tailleurId) {
        showError('❌ Veuillez sélectionner un tailleur');
        return;
    }
    
    if (selectedClients.size === 0) {
        showError('❌ Veuillez sélectionner au moins un client');
        return;
    }
    
    const affectationData = {
        tailleurId: tailleurId,
        dateEcheance: dateEcheance || null,
        affectations: Array.from(selectedClients.values())
    };
    
    try {
        const token = getToken();
        const response = await fetch(`${apiAffectations}?atelierId=${currentAtelierId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-User-Id': currentUserId
            },
            body: JSON.stringify(affectationData)
        });

        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

        const result = await response.json();
        showSuccess('✅ Affectation créée avec succès !');
        resetForm();
        await loadAffectations();
        await loadClientsAvecMesures(); // Recharger pour mettre à jour les mesures disponibles
        
    } catch (error) {
        console.error('Erreur affectation:', error);
        showError('❌ Erreur lors de la création de l\'affectation: ' + error.message);
    }
}

// AFFICHAGE DES AFFECTATIONS
function displayAffectations(affectations) {
    const container = document.getElementById('affectationsList');
    if (!container) return;

    if (!affectations || affectations.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-clipboard-list fa-2x text-muted mb-3"></i>
                <p class="text-muted">Aucune affectation trouvée</p>
                <small class="text-muted">Les affectations apparaîtront ici après leur création</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = affectations.map(affectation => {
        const statutClass = getStatutClass(affectation.statut);
        const progressPercent = calculateProgress(affectation.statut);
        const peutChangerStatut = peutChangerStatutAffectation(affectation);
        
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="card-title">
                                ${affectation.client.prenom} ${affectation.client.nom}
                                <span class="badge ${statutClass} ms-2">${getStatutText(affectation.statut)}</span>
                            </h6>
                            
                            <div class="mb-2">
                                <strong>Tailleur:</strong> ${affectation.tailleur.prenom} ${affectation.tailleur.nom}
                            </div>
                            
                            <div class="mb-2">
                                <strong>Type vêtement:</strong> ${affectation.mesure.typeVetement}
                            </div>
                            
                            <div class="mb-2">
                                <strong>Prix tailleur:</strong> 
                                <span class="text-success fw-bold">${affectation.prixTailleur ? affectation.prixTailleur.toLocaleString() : '0'} FCFA</span>
                            </div>
                            
                            <div class="mb-2">
                                <strong>Date création:</strong> 
                                ${new Date(affectation.dateCreation).toLocaleDateString('fr-FR')}
                            </div>
                        </div>
                        
                        <div class="col-md-4">
                            <!-- Barre de progression -->
                            <div class="mb-3">
                                <div class="d-flex justify-content-between mb-1">
                                    <small>Progression</small>
                                    <small>${progressPercent}%</small>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar ${statutClass}" 
                                         style="width: ${progressPercent}%"></div>
                                </div>
                            </div>
                            
                            <!-- Actions selon le statut et les permissions -->
                            <div class="text-end">
                                ${peutChangerStatut.demarrer ? `
                                    <button class="btn btn-sm btn-success me-1" 
                                            onclick="changerStatut('${affectation.id}', 'EN_COURS')">
                                        <i class="fas fa-play me-1"></i>Démarrer
                                    </button>
                                ` : ''}
                                
                                ${peutChangerStatut.terminer ? `
                                    <button class="btn btn-sm btn-primary me-1" 
                                            onclick="changerStatut('${affectation.id}', 'TERMINE')">
                                        <i class="fas fa-flag-checkered me-1"></i>Terminer
                                    </button>
                                ` : ''}
                                
                                ${peutChangerStatut.valider ? `
                                    <button class="btn btn-sm btn-success me-1" 
                                            onclick="changerStatut('${affectation.id}', 'VALIDE')"
                                            title="Valider et notifier le client par email">
                                        <i class="fas fa-check me-1"></i>Valider & Notifier
                                    </button>
                                ` : ''}
                                
                                ${peutChangerStatut.annuler ? `
                                    <button class="btn btn-sm btn-outline-danger" 
                                            onclick="annulerAffectation('${affectation.id}')">
                                        <i class="fas fa-times me-1"></i>Annuler
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Vérifier quelles actions sont possibles sur une affectation
function peutChangerStatutAffectation(affectation) {
    const estMonTravail = affectation.tailleur.id === currentUserId;
    
    return {
        demarrer: estMonTravail && affectation.statut === 'EN_ATTENTE' && currentUserRole === 'TAILLEUR',
        terminer: estMonTravail && affectation.statut === 'EN_COURS' && currentUserRole === 'TAILLEUR',
        valider: affectation.statut === 'TERMINE' && (currentUserRole === 'PROPRIETAIRE' || currentUserRole === 'SECRETAIRE'),
        annuler: canCancelAffectation() && affectation.statut !== 'VALIDE'
    };
}

// CHANGEMENT DE STATUT
// async function changerStatut(affectationId, nouveauStatut) {
//     try {
//         const result = await Swal.fire({
//             title: 'Changer le statut ?',
//             text: `Voulez-vous vraiment passer à "${getStatutText(nouveauStatut)}" ?`,
//             icon: 'question',
//             showCancelButton: true,
//             confirmButtonColor: '#198754',
//             cancelButtonColor: '#6c757d',
//             confirmButtonText: 'Oui, changer',
//             cancelButtonText: 'Annuler'
//         });

//         if (result.isConfirmed) {
//             const token = getToken();
//             const response = await fetch(`${apiAffectations}/${affectationId}/statut`, {
//                 method: 'PATCH',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`,
//                     'X-User-Id': currentUserId,
//                     'X-User-Role': currentUserRole
//                 },
//                 body: JSON.stringify({ statut: nouveauStatut })
//             });

//             if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

//             showSuccess('✅ Statut mis à jour avec succès !');
//             await loadAffectations();
//         }
//     } catch (error) {
//         console.error('Erreur changement statut:', error);
//         showError('❌ Erreur lors du changement de statut: ' + error.message);
//     }
// }
// Dans affectation.js - Remplacer l'ancien système
async function changerStatut(affectationId, nouveauStatut) {
    try {
        const result = await Swal.fire({
            title: 'Changer le statut ?',
            text: `Voulez-vous vraiment passer à "${getStatutText(nouveauStatut)}" ?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Oui, changer',
            cancelButtonText: 'Annuler'
        });

        if (result.isConfirmed) {
            const token = getToken();
            const response = await fetch(`${apiAffectations}/${affectationId}/statut`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-User-Id': currentUserId,
                    'X-User-Role': currentUserRole
                },
                body: JSON.stringify({ statut: nouveauStatut })
            });

            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

            const resultData = await response.json();
            
            // ✅ NOTIFICATION GLOBALE quand un tailleur termine un travail
            if (nouveauStatut === 'TERMINE' && currentUserRole === 'TAILLEUR') {
                const affectation = resultData.data;
                
                // Utilisation du système global
                window.NotificationManager.add(
                    '👕 Travail Terminé - Validation Requise',
                    `Le tailleur ${affectation.tailleur.prenom} ${affectation.tailleur.nom} a terminé le ${affectation.mesure.typeVetement} de ${affectation.client.prenom} ${affectation.client.nom}`,
                    'success',
                    'affectation.html',
                    {
                        source: 'Atelier Couture',
                        affectationId: affectation.id,
                        tailleurId: affectation.tailleur.id,
                        clientId: affectation.client.id
                    }
                );
            }

            showSuccess('✅ Statut mis à jour avec succès !');
            await loadAffectations();
        }
    } catch (error) {
        console.error('Erreur changement statut:', error);
        showError('❌ Erreur lors du changement de statut: ' + error.message);
    }
}
// ANNULATION D'AFFECTATION
async function annulerAffectation(affectationId) {
    try {
        const result = await Swal.fire({
            title: 'Annuler cette affectation ?',
            text: 'Cette action est irréversible.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Oui, annuler',
            cancelButtonText: 'Garder'
        });

        if (result.isConfirmed) {
            const token = getToken();
            const response = await fetch(`${apiAffectations}/${affectationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-User-Id': currentUserId,
                    'X-User-Role': currentUserRole
                }
            });

            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

            showSuccess('✅ Affectation annulée avec succès !');
            await loadAffectations();
            if (canCreateAffectation()) {
                await loadClientsAvecMesures();
            }
        }
    } catch (error) {
        console.error('Erreur annulation:', error);
        showError('❌ Erreur lors de l\'annulation: ' + error.message);
    }
}

// FONCTIONS UTILITAIRES
function resetForm() {
    selectedClients.clear();
    const form = document.getElementById('formAffectation');
    if (form) form.reset();
    initializeComponents();
    filterAndDisplayClients();
    updateSelectionSummary();
}

function resetFilters() {
    document.getElementById('filterStatutAffectation').value = '';
    document.getElementById('filterTailleurAffectation').value = '';
    overdueOnlyMode = false;
    loadAffectations();
}

function filterAffectations() {
    loadAffectations();
}

// FONCTIONS STATUT
function calculateProgress(statut) {
    switch (statut) {
        case 'EN_ATTENTE': return 10;
        case 'EN_COURS': return 50;
        case 'TERMINE': return 90;
        case 'VALIDE': return 100;
        default: return 0;
    }
}

function getStatutClass(statut) {
    const classes = {
        'EN_ATTENTE': 'bg-warning',
        'EN_COURS': 'bg-info',
        'TERMINE': 'bg-success',
        'VALIDE': 'bg-primary',
        'ANNULE': 'bg-danger'
    };
    return classes[statut] || 'bg-secondary';
}

function getStatutText(statut) {
    const texts = {
        'EN_ATTENTE': 'En attente',
        'EN_COURS': 'En cours',
        'TERMINE': 'Terminé',
        'VALIDE': 'Validé',
        'ANNULE': 'Annulé'
    };
    return texts[statut] || statut;
}

// INITIALISATION AU CHARGEMENT DE LA PAGE
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM chargé - Initialisation affectation');
    
    // Vérifier que Common est chargé
    if (typeof window.Common === 'undefined') {
        console.error('❌ Common.js non chargé - Redirection...');
        setTimeout(() => window.location.href = 'index.html', 1000);
        return;
    }
    
    // Vérifier l'authentification
    const token = getToken();
    if (!token) {
        console.log('🔒 Non authentifié - Redirection vers index.html');
        window.location.href = 'index.html';
        return;
    }
    
    initAffectation();
});