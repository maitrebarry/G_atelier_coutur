// paiement.js - Gestion des paiements clients et tailleurs
let currentAtelierId = null;
let currentUserRole = null;
let currentUserId = null;

const apiPaiements = "http://localhost:8081/api/paiements";

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
function initPaiements() {
    const userData = getUserData();
    currentUserRole = userData.role;
    currentUserId = userData.userId;
    currentAtelierId = userData.atelierId;

    console.log('💰 Initialisation paiements - Role:', currentUserRole, 'Atelier:', currentAtelierId);

    // Vérifier les permissions
    if (!hasPaiementPermissions()) {
        window.location.href = 'home.html';
        return;
    }

    // Initialiser les composants
    initializePaiementComponents();
    setupPaiementEventListeners();

    // Charger les données initiales
    loadClientsPaiements();
    loadTailleursPaiements();
}

// Permissions pour les paiements
function hasPaiementPermissions() {
    console.log('🔐 Vérification permissions paiements pour:', currentUserRole);
    
    // SUPERADMIN, PROPRIETAIRE, SECRETAIRE peuvent gérer les paiements
    // TAILLEUR ne peut pas gérer les paiements
    const rolesAutorises = ['SUPERADMIN', 'PROPRIETAIRE', 'SECRETAIRE'];
    const autorise = rolesAutorises.includes(currentUserRole);
    
    if (!autorise) {
        showError('❌ Vous n\'avez pas les permissions pour gérer les paiements');
    }
    
    return autorise;
}

// Initialisation des composants
function initializePaiementComponents() {
    // Les éléments de date sont créés dynamiquement, donc pas d'initialisation ici
    console.log('✅ Composants paiements initialisés');
}

// Configuration des événements
function setupPaiementEventListeners() {
    // Filtres clients
    document.getElementById('filterStatutClient')?.addEventListener('change', filterClientsPaiements);
    document.getElementById('searchClient')?.addEventListener('input', filterClientsPaiements);
    document.getElementById('btnResetFiltersClient')?.addEventListener('click', resetFiltresClients);

    // Filtres tailleurs
    document.getElementById('filterStatutTailleur')?.addEventListener('change', filterTailleursPaiements);
    document.getElementById('searchTailleur')?.addEventListener('input', filterTailleursPaiements);
    document.getElementById('btnResetFiltersTailleur')?.addEventListener('click', resetFiltresTailleurs);

    // Bouton actualiser
    document.getElementById('btnRefresh')?.addEventListener('click', refreshPaiements);

    // Pas d'écouteurs pour les formulaires car ils sont créés dynamiquement
}

// CHARGEMENT DES DONNÉES
async function loadClientsPaiements() {
    try {
        const token = getToken();
        const searchTerm = document.getElementById('searchClient')?.value || '';
        const statutFilter = document.getElementById('filterStatutClient')?.value || '';

        let url = `${apiPaiements}/clients/recherche?atelierId=${currentAtelierId}`;
        if (searchTerm) url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
        if (statutFilter) url += `&statutPaiement=${statutFilter}`;

        console.log('📡 Chargement clients paiements:', url);

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

        const data = await response.json();
        console.log('✅ Clients chargés:', data);
        displayClientsPaiements(data);
    } catch (error) {
        console.error("Erreur chargement clients paiements:", error);
        showError("Erreur lors du chargement des clients");
    }
}

async function loadTailleursPaiements() {
    try {
        const token = getToken();
        const searchTerm = document.getElementById('searchTailleur')?.value || '';
        const statutFilter = document.getElementById('filterStatutTailleur')?.value || '';

        let url = `${apiPaiements}/tailleurs/recherche?atelierId=${currentAtelierId}`;
        if (searchTerm) url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
        if (statutFilter) url += `&statutPaiement=${statutFilter}`;

        console.log('📡 Chargement tailleurs paiements:', url);

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

        const data = await response.json();
        console.log('✅ Tailleurs chargés:', data);
        displayTailleursPaiements(data);
    } catch (error) {
        console.error("Erreur chargement tailleurs paiements:", error);
        showError("Erreur lors du chargement des tailleurs");
    }
}

// AFFICHAGE DES DONNÉES
function displayClientsPaiements(clients) {
    const container = document.getElementById('clientsList');
    if (!container) {
        console.error('❌ Container clientsList non trouvé');
        return;
    }

    if (!clients || clients.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-4">
                <i class="fas fa-users fa-2x text-muted mb-3"></i>
                <p class="text-muted">Aucun client trouvé</p>
                <small class="text-muted">Les clients apparaîtront ici après création d'affectations</small>
            </div>
        `;
        return;
    }

    container.innerHTML = clients.map(client => {
        const pourcentagePaye = client.prixTotal > 0 ? (client.montantPaye / client.prixTotal) * 100 : 0;
        const statutClass = getStatutPaiementClass(client.statutPaiement);

        return `
            <div class="col-md-6 mb-3">
                <div class="card payment-card" onclick="selectionnerClient('${client.clientId}')">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="client-avatar me-3">
                                ${getInitiales(client.clientNom, client.clientPrenom)}
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="mb-1">${client.clientPrenom} ${client.clientNom}</h6>
                                <p class="text-muted mb-0 small">${client.modeleNom || 'Modèle personnalisé'}</p>
                            </div>
                            <span class="status-badge ${statutClass}">
                                ${getStatutPaiementText(client.statutPaiement)}
                            </span>
                        </div>
                        
                        <div class="mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <small>Progression du paiement</small>
                                <small>${Math.round(pourcentagePaye)}%</small>
                            </div>
                            <div class="progress">
                                <div class="progress-bar" role="progressbar" 
                                     style="width: ${pourcentagePaye}%"></div>
                            </div>
                        </div>

                        <div class="row text-center">
                            <div class="col-4">
                                <small class="text-muted d-block">Total</small>
                                <strong class="amount-display text-primary">${client.prixTotal?.toLocaleString() || '0'} F</strong>
                            </div>
                            <div class="col-4">
                                <small class="text-muted d-block">Payé</small>
                                <strong class="amount-display text-success">${client.montantPaye?.toLocaleString() || '0'} F</strong>
                            </div>
                            <div class="col-4">
                                <small class="text-muted d-block">Reste</small>
                                <strong class="amount-display text-warning">${client.resteAPayer?.toLocaleString() || '0'} F</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function displayTailleursPaiements(tailleurs) {
    const container = document.getElementById('tailleursList');
    if (!container) {
        console.error('❌ Container tailleursList non trouvé');
        return;
    }

    if (!tailleurs || tailleurs.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-4">
                <i class="fas fa-user-tie fa-2x text-muted mb-3"></i>
                <p class="text-muted">Aucun tailleur trouvé</p>
                <small class="text-muted">Les tailleurs apparaîtront ici après création d'affectations</small>
            </div>
        `;
        return;
    }

    container.innerHTML = tailleurs.map(tailleur => {
        const pourcentagePaye = tailleur.totalDu > 0 ? (tailleur.montantPaye / tailleur.totalDu) * 100 : 0;
        const statutClass = getStatutPaiementClass(tailleur.statutPaiement);

        return `
            <div class="col-md-6 mb-3">
                <div class="card payment-card" onclick="selectionnerTailleur('${tailleur.tailleurId}')">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="client-avatar me-3 bg-warning">
                                ${getInitiales(tailleur.tailleurNom, tailleur.tailleurPrenom)}
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="mb-1">${tailleur.tailleurPrenom} ${tailleur.tailleurNom}</h6>
                                <p class="text-muted mb-0 small">${tailleur.modelesCousus || 0} modèles cousus</p>
                            </div>
                            <span class="status-badge ${statutClass}">
                                ${getStatutPaiementText(tailleur.statutPaiement)}
                            </span>
                        </div>
                        
                        <div class="mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <small>Progression du paiement</small>
                                <small>${Math.round(pourcentagePaye)}%</small>
                            </div>
                            <div class="progress">
                                <div class="progress-bar bg-warning" role="progressbar" 
                                     style="width: ${pourcentagePaye}%"></div>
                            </div>
                        </div>

                        <div class="row text-center">
                            <div class="col-4">
                                <small class="text-muted d-block">Total dû</small>
                                <strong class="amount-display text-primary">${tailleur.totalDu?.toLocaleString() || '0'} F</strong>
                            </div>
                            <div class="col-4">
                                <small class="text-muted d-block">Payé</small>
                                <strong class="amount-display text-success">${tailleur.montantPaye?.toLocaleString() || '0'} F</strong>
                            </div>
                            <div class="col-4">
                                <small class="text-muted d-block">Reste</small>
                                <strong class="amount-display text-warning">${tailleur.resteAPayer?.toLocaleString() || '0'} F</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// SÉLECTION CLIENT/TAILLEUR
async function selectionnerClient(clientId) {
    try {
        const token = getToken();
        const response = await fetch(`${apiPaiements}/clients/${clientId}?atelierId=${currentAtelierId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

        const client = await response.json();
        afficherDetailsClient(client);
    } catch (error) {
        console.error("Erreur chargement détails client:", error);
        showError("Erreur lors du chargement des détails du client");
    }
}

async function selectionnerTailleur(tailleurId) {
    try {
        const token = getToken();
        const response = await fetch(`${apiPaiements}/tailleurs/${tailleurId}?atelierId=${currentAtelierId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

        const tailleur = await response.json();
        afficherDetailsTailleur(tailleur);
    } catch (error) {
        console.error("Erreur chargement détails tailleur:", error);
        showError("Erreur lors du chargement des détails du tailleur");
    }
}

// AFFICHAGE DES DÉTAILS
function afficherDetailsClient(client) {
    const detailsCard = document.getElementById('clientDetailsCard');
    const paymentFormCard = document.getElementById('paymentFormCard');

    if (!detailsCard || !paymentFormCard) {
        console.error('❌ Cards détails non trouvées');
        return;
    }

    // Afficher les détails
    detailsCard.innerHTML = `
        <div class="card-header bg-primary text-white">
            <h6 class="mb-0">Détails du Client</h6>
        </div>
        <div class="card-body">
            <h6>${client.clientPrenom} ${client.clientNom}</h6>
            <p class="text-muted mb-2">${client.clientTelephone || 'Téléphone non renseigné'}</p>
            
            <div class="mb-3">
                <label class="form-label small text-muted">Prix total</label>
                <div class="amount-display text-primary">${client.prixTotal?.toLocaleString() || '0'} FCFA</div>
            </div>
            
            <div class="mb-3">
                <label class="form-label small text-muted">Déjà payé</label>
                <div class="amount-display text-success">${client.montantPaye?.toLocaleString() || '0'} FCFA</div>
            </div>
            
            <div class="mb-3">
                <label class="form-label small text-muted">Reste à payer</label>
                <div class="amount-display text-warning">${client.resteAPayer?.toLocaleString() || '0'} FCFA</div>
            </div>
            
            <div class="mb-3">
                <label class="form-label small text-muted">Statut</label>
                <div>
                    <span class="status-badge ${getStatutPaiementClass(client.statutPaiement)}">
                        ${getStatutPaiementText(client.statutPaiement)}
                    </span>
                </div>
            </div>

            ${client.historiquePaiements && client.historiquePaiements.length > 0 ? `
                <hr>
                <h6>Historique des paiements</h6>
                <div class="payment-history">
                    ${client.historiquePaiements.map(p => `
                        <div class="history-item">
                            <div class="d-flex justify-content-between">
                                <span>${p.reference}</span>
                                <span>${p.montant?.toLocaleString() || '0'} F</span>
                            </div>
                            <div class="d-flex justify-content-between small text-muted">
                                <span>${p.moyen}</span>
                                <span>${p.datePaiement ? new Date(p.datePaiement).toLocaleDateString('fr-FR') : 'Date inconnue'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="text-muted text-center small">Aucun paiement enregistré</p>'}
        </div>
    `;

    // Afficher le formulaire de paiement
    paymentFormCard.innerHTML = `
        <div class="card-header bg-success text-white">
            <h6 class="mb-0">Effectuer un Paiement</h6>
        </div>
        <div class="card-body">
            <form id="formPaiementClient">
                <input type="hidden" id="selectedClientId" value="${client.clientId}">
                <div class="mb-3">
                    <label class="form-label">Montant versé (FCFA)</label>
                    <input type="number" class="form-control" id="montantVerseClient" required 
                           max="${client.resteAPayer || 0}" placeholder="Montant à verser"
                           oninput="validerMontantClient(this, ${client.resteAPayer || 0})">
                    <div class="form-text text-warning" id="messageMontantClient" style="display: none;">
                        Le montant ne peut pas dépasser ${(client.resteAPayer || 0).toLocaleString()} FCFA
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Mode de paiement</label>
                    <select class="form-select" id="modePaiementClient" required>
                        <option value="">-- Sélectionner --</option>
                        <option value="ESPECES">Espèces</option>
                        <option value="MOBILE_MONEY">Mobile Money</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">Référence</label>
                    <input type="text" class="form-control" id="referencePaiementClient" required 
                           value="REF-CLI-${Date.now().toString().slice(-6)}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Date du paiement</label>
                    <input type="date" class="form-control" id="datePaiementClient" required 
                           value="${new Date().toISOString().split('T')[0]}">
                </div>
                <button type="submit" class="btn btn-success w-100" id="btnSubmitClient">
                    <i class="fas fa-check me-1"></i>Enregistrer le paiement
                </button>
            </form>
        </div>
    `;

    // Réattacher l'événement submit
    document.getElementById('formPaiementClient').addEventListener('submit', enregistrerPaiementClient);
}

function afficherDetailsTailleur(tailleur) {
    const detailsCard = document.getElementById('tailleurDetailsCard');
    const paymentFormCard = document.getElementById('paymentFormTailleurCard');

    if (!detailsCard || !paymentFormCard) {
        console.error('❌ Cards détails tailleur non trouvées');
        return;
    }

    // Afficher les détails
    detailsCard.innerHTML = `
        <div class="card-header bg-warning text-dark">
            <h6 class="mb-0">Détails du Tailleur</h6>
        </div>
        <div class="card-body">
            <h6>${tailleur.tailleurPrenom} ${tailleur.tailleurNom}</h6>
            <p class="text-muted mb-2">${tailleur.tailleurEmail || 'Email non renseigné'}</p>
            
            <div class="mb-3">
                <label class="form-label small text-muted">Total dû</label>
                <div class="amount-display text-primary">${tailleur.totalDu?.toLocaleString() || '0'} FCFA</div>
            </div>
            
            <div class="mb-3">
                <label class="form-label small text-muted">Déjà payé</label>
                <div class="amount-display text-success">${tailleur.montantPaye?.toLocaleString() || '0'} FCFA</div>
            </div>
            
            <div class="mb-3">
                <label class="form-label small text-muted">Reste à payer</label>
                <div class="amount-display text-warning">${tailleur.resteAPayer?.toLocaleString() || '0'} FCFA</div>
            </div>
            
            <div class="mb-3">
                <label class="form-label small text-muted">Statut</label>
                <div>
                    <span class="status-badge ${getStatutPaiementClass(tailleur.statutPaiement)}">
                        ${getStatutPaiementText(tailleur.statutPaiement)}
                    </span>
                </div>
            </div>

            ${tailleur.historiquePaiements && tailleur.historiquePaiements.length > 0 ? `
                <hr>
                <h6>Historique des paiements</h6>
                <div class="payment-history">
                    ${tailleur.historiquePaiements.map(p => `
                        <div class="history-item">
                            <div class="d-flex justify-content-between">
                                <span>${p.reference}</span>
                                <span>${p.montant?.toLocaleString() || '0'} F</span>
                            </div>
                            <div class="d-flex justify-content-between small text-muted">
                                <span>${p.moyen}</span>
                                <span>${p.datePaiement ? new Date(p.datePaiement).toLocaleDateString('fr-FR') : 'Date inconnue'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="text-muted text-center small">Aucun paiement enregistré</p>'}
        </div>
    `;

    // Afficher le formulaire de paiement
    paymentFormCard.innerHTML = `
        <div class="card-header bg-warning text-dark">
            <h6 class="mb-0">Payer le Tailleur</h6>
        </div>
        <div class="card-body">
            <form id="formPaiementTailleur">
                <input type="hidden" id="selectedTailleurId" value="${tailleur.tailleurId}">
                <div class="mb-3">
                    <label class="form-label">Montant versé (FCFA)</label>
                    <input type="number" class="form-control" id="montantVerseTailleur" required 
                           max="${tailleur.resteAPayer || 0}" placeholder="Montant à verser"
                           oninput="validerMontantTailleur(this, ${tailleur.resteAPayer || 0})">
                    <div class="form-text text-warning" id="messageMontantTailleur" style="display: none;">
                        Le montant ne peut pas dépasser ${(tailleur.resteAPayer || 0).toLocaleString()} FCFA
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Mode de paiement</label>
                    <select class="form-select" id="modePaiementTailleur" required>
                        <option value="">-- Sélectionner --</option>
                        <option value="ESPECES">Espèces</option>
                        <option value="MOBILE_MONEY">Mobile Money</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">Référence</label>
                    <input type="text" class="form-control" id="referencePaiementTailleur" required 
                           value="REF-TAI-${Date.now().toString().slice(-6)}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Date du paiement</label>
                    <input type="date" class="form-control" id="datePaiementTailleur" required 
                           value="${new Date().toISOString().split('T')[0]}">
                </div>
                <button type="submit" class="btn btn-warning w-100" id="btnSubmitTailleur">
                    <i class="fas fa-check me-1"></i>Enregistrer le paiement
                </button>
            </form>
        </div>
    `;

    // Réattacher l'événement submit
    document.getElementById('formPaiementTailleur').addEventListener('submit', enregistrerPaiementTailleur);
}

// VALIDATION DES MONTANTS
function validerMontantClient(input, maxMontant) {
    const message = document.getElementById('messageMontantClient');
    const btnSubmit = document.getElementById('btnSubmitClient');
    
    if (parseFloat(input.value) > maxMontant) {
        if (message) message.style.display = 'block';
        if (btnSubmit) btnSubmit.disabled = true;
    } else {
        if (message) message.style.display = 'none';
        if (btnSubmit) btnSubmit.disabled = false;
    }
}

function validerMontantTailleur(input, maxMontant) {
    const message = document.getElementById('messageMontantTailleur');
    const btnSubmit = document.getElementById('btnSubmitTailleur');
    
    if (parseFloat(input.value) > maxMontant) {
        if (message) message.style.display = 'block';
        if (btnSubmit) btnSubmit.disabled = true;
    } else {
        if (message) message.style.display = 'none';
        if (btnSubmit) btnSubmit.disabled = false;
    }
}

// ==================== GESTION DES REÇUS ====================

async function afficherRecuPaiement(paiementId, type) {
    try {
        const token = getToken();
        const url = `${apiPaiements}/recu/${type}/${paiementId}?atelierId=${currentAtelierId}`;
        
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

        const recu = await response.json();
        afficherModalRecu(recu);
    } catch (error) {
        console.error("Erreur chargement reçu:", error);
        showError("Erreur lors du chargement du reçu");
    }
}

function afficherModalRecu(recu) {
    const recuContent = document.getElementById('recuContent');
    
    const recuHTML = `
        <div class="recu-header">
            <div class="recu-title">${recu.atelierNom}</div>
            <div class="recu-subtitle">Reçu de Paiement</div>
            <div style="font-size: 0.9em; color: #666;">
                ${recu.atelierAdresse || ''} ${recu.atelierTelephone ? ' | ' + recu.atelierTelephone : ''}
            </div>
        </div>

        <div class="recu-info">
            <div class="recu-line">
                <span class="recu-label">Référence:</span>
                <span class="recu-value">${recu.reference}</span>
            </div>
            <div class="recu-line">
                <span class="recu-label">Date:</span>
                <span class="recu-value">${new Date(recu.datePaiement).toLocaleDateString('fr-FR')} ${new Date(recu.datePaiement).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            
            ${recu.clientNom ? `
                <div class="recu-line">
                    <span class="recu-label">Client:</span>
                    <span class="recu-value">${recu.clientPrenom} ${recu.clientNom}</span>
                </div>
                ${recu.clientContact ? `
                    <div class="recu-line">
                        <span class="recu-label">Contact:</span>
                        <span class="recu-value">${recu.clientContact}</span>
                    </div>
                ` : ''}
            ` : ''}
            
            ${recu.tailleurNom ? `
                <div class="recu-line">
                    <span class="recu-label">Tailleur:</span>
                    <span class="recu-value">${recu.tailleurPrenom} ${recu.tailleurNom}</span>
                </div>
                ${recu.tailleurContact ? `
                    <div class="recu-line">
                        <span class="recu-label">Contact:</span>
                        <span class="recu-value">${recu.tailleurContact}</span>
                    </div>
                ` : ''}
            ` : ''}
            
            <div class="recu-line">
                <span class="recu-label">Mode de paiement:</span>
                <span class="recu-value">${getMoyenPaiementText(recu.moyenPaiement)}</span>
            </div>
        </div>

        <div class="recu-total">
            <div class="recu-line">
                <span class="recu-label">MONTANT:</span>
                <span class="recu-value">${recu.montant.toLocaleString()} FCFA</span>
            </div>
        </div>

        ${recu.qrCodeData ? `
            <div class="recu-qr">
                <div style="margin-bottom: 10px; font-weight: bold;">Code de vérification</div>
                <div style="background: white; padding: 10px; display: inline-block; border: 1px solid #ddd;">
                    ${recu.qrCodeData}
                </div>
                <div style="font-size: 0.8em; margin-top: 5px; color: #666;">
                    Scannez pour vérifier
                </div>
            </div>
        ` : ''}

        <div class="recu-footer">
            <div>Merci pour votre confiance</div>
            <div style="margin-top: 5px;">Reçu émis le ${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
    `;
    
    recuContent.innerHTML = recuHTML;
    
    // Afficher le modal
    const recuModal = new bootstrap.Modal(document.getElementById('recuModal'));
    recuModal.show();
}

function getMoyenPaiementText(moyen) {
    const moyens = {
        'ESPECES': 'Espèces',
        'MOBILE_MONEY': 'Mobile Money',
        'VIREMENT': 'Virement Bancaire',
        'CARTE': 'Carte Bancaire'
    };
    return moyens[moyen] || moyen;
}

function imprimerRecu() {
    window.print();
}

async function telechargerRecu() {
    try {
        const recuContent = document.getElementById('recuContent').innerHTML;
        
        // Créer un blob HTML pour le téléchargement
        const blob = new Blob([`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reçu de Paiement</title>
                <style>
                    body { font-family: 'Courier New', monospace; margin: 20px; }
                    ${document.querySelector('style').innerText}
                </style>
            </head>
            <body>
                ${recuContent}
            </body>
            </html>
        `], { type: 'text/html' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recu-paiement-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showSuccess('Reçu téléchargé avec succès');
    } catch (error) {
        console.error('Erreur téléchargement reçu:', error);
        showError('Erreur lors du téléchargement du reçu');
    }
}

// ENREGISTREMENT DES PAIEMENTS
async function enregistrerPaiementClient(event) {
    event.preventDefault();
    
    const clientId = document.getElementById('selectedClientId').value;
    const montant = parseFloat(document.getElementById('montantVerseClient').value);
    const moyen = document.getElementById('modePaiementClient').value;
    const reference = document.getElementById('referencePaiementClient').value;
    const datePaiement = document.getElementById('datePaiementClient').value;

    // Validation finale
    if (montant <= 0) {
        showError('Le montant doit être supérieur à 0');
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${apiPaiements}/clients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                montant: montant,
                moyen: moyen,
                reference: reference,
                clientId: clientId,
                atelierId: currentAtelierId
            })
        });

       if (response.ok) {
            const result = await response.json();
            showSuccess('✅ Paiement client enregistré avec succès !');
            
            // Afficher le reçu automatiquement
            await afficherRecuPaiement(result.id, 'client');
            
            await loadClientsPaiements();
            await selectionnerClient(clientId);
        }

        showSuccess('✅ Paiement client enregistré avec succès !');
        await loadClientsPaiements();
        await selectionnerClient(clientId); // Recharger les détails

    } catch (error) {
        console.error('Erreur enregistrement paiement client:', error);
        showError('❌ Erreur lors de l\'enregistrement: ' + error.message);
    }
}

async function enregistrerPaiementTailleur(event) {
    event.preventDefault();
    
    const tailleurId = document.getElementById('selectedTailleurId').value;
    const montant = parseFloat(document.getElementById('montantVerseTailleur').value);
    const moyen = document.getElementById('modePaiementTailleur').value;
    const reference = document.getElementById('referencePaiementTailleur').value;
    const datePaiement = document.getElementById('datePaiementTailleur').value;

    // Validation finale
    if (montant <= 0) {
        showError('Le montant doit être supérieur à 0');
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${apiPaiements}/tailleurs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                montant: montant,
                moyen: moyen,
                reference: reference,
                tailleurId: tailleurId,
                atelierId: currentAtelierId
            })
        });

        if (response.ok) {
            const result = await response.json();
            showSuccess('✅ Paiement tailleur enregistré avec succès !');
            
            // Afficher le reçu automatiquement
            await afficherRecuPaiement(result.id, 'tailleur');
            
            await loadTailleursPaiements();
            await selectionnerTailleur(tailleurId);
        }
        showSuccess('✅ Paiement tailleur enregistré avec succès !');
        await loadTailleursPaiements();
        await selectionnerTailleur(tailleurId); // Recharger les détails

    } catch (error) {
        console.error('Erreur enregistrement paiement tailleur:', error);
        showError('❌ Erreur lors de l\'enregistrement: ' + error.message);
    }
}

// FONCTIONS UTILITAIRES
function filterClientsPaiements() {
    loadClientsPaiements();
}

function filterTailleursPaiements() {
    loadTailleursPaiements();
}

function resetFiltresClients() {
    document.getElementById('filterStatutClient').value = '';
    document.getElementById('searchClient').value = '';
    loadClientsPaiements();
}

function resetFiltresTailleurs() {
    document.getElementById('filterStatutTailleur').value = '';
    document.getElementById('searchTailleur').value = '';
    loadTailleursPaiements();
}

function refreshPaiements() {
    loadClientsPaiements();
    loadTailleursPaiements();
    showSuccess('Données actualisées');
}

// FONCTIONS STATUT
function getStatutPaiementClass(statut) {
    const classes = {
        'EN_ATTENTE': 'status-pending',
        'PARTIEL': 'status-partial',
        'PAYE': 'status-paid'
    };
    return classes[statut] || 'status-pending';
}

function getStatutPaiementText(statut) {
    const texts = {
        'EN_ATTENTE': 'En attente',
        'PARTIEL': 'Partiel',
        'PAYE': 'Payé'
    };
    return texts[statut] || statut;
}

function getInitiales(nom, prenom) {
    return ((prenom || '').charAt(0) + (nom || '').charAt(0)).toUpperCase();
}

// INITIALISATION AU CHARGEMENT DE LA PAGE
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM chargé - Initialisation paiements');
    
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
    
    initPaiements();
});