// rendezvous.js - Gestion des rendez-vous (Version API réelle intégrée)

let selectedClient = null;
let currentAtelierId = null;
const API_BASE_URL = 'http://localhost:8081/api';

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation du module rendez-vous');
    
    // Vérifier les permissions
    if (!Common.hasPermission('RENDEZVOUS_VIEW')) {
        Common.showErrorMessage('Accès refusé. Vous n\'avez pas la permission de gérer les rendez-vous.');
        window.location.href = 'home.html';
        return;
    }

    // Récupérer l'ID de l'atelier depuis les données utilisateur
    const userData = Common.getUserData();
    currentAtelierId = userData.atelierId || userData.atelier?.id;
    
    if (!currentAtelierId) {
        Common.showErrorMessage('Atelier non configuré');
        return;
    }

    initializeRendezVous();
    loadClients();
    loadRendezVousAVenir();
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

// === FONCTIONS CLIENT ===
async function loadClients() {
    console.log('👥 Chargement des clients depuis l\'API');
    
    try {
        Common.showLoading('Chargement des clients...');
        const clients = await apiCall(`/rendezvous/atelier/${currentAtelierId}/clients`);
        displayClients(clients);
        Common.hideLoading();
    } catch (error) {
        console.error('Erreur chargement clients:', error);
        Common.hideLoading();
        Common.showErrorMessage('Erreur lors du chargement des clients');
    }
}

async function loadClientDetails(clientId) {
    try {
        const clientDetails = await apiCall(`/rendezvous/clients/${clientId}/details`);
        return clientDetails;
    } catch (error) {
        console.error('Erreur chargement détails client:', error);
        throw error;
    }
}

// === FONCTIONS RENDEZ-VOUS ===
async function creerRendezVous(data) {
    return await apiCall('/rendezvous', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function loadRendezVousAVenir() {
    try {
        const rendezVous = await apiCall(`/rendezvous/atelier/${currentAtelierId}/a-venir`);
        displayRendezVous(rendezVous);
    } catch (error) {
        console.error('Erreur chargement rendez-vous:', error);
        Common.showErrorMessage('Erreur lors du chargement des rendez-vous');
    }
}

async function confirmerRendezVous(rendezVousId) {
    return await apiCall(`/rendezvous/${rendezVousId}/confirmer`, {
        method: 'PUT'
    });
}

async function annulerRendezVous(rendezVousId) {
    return await apiCall(`/rendezvous/${rendezVousId}/annuler`, {
        method: 'PUT'
    });
}

async function terminerRendezVous(rendezVousId) {
    return await apiCall(`/rendezvous/${rendezVousId}/terminer`, {
        method: 'PUT'
    });
}

// === INITIALISATION ===
function initializeRendezVous() {
    console.log('📅 Initialisation du formulaire rendez-vous');
    
    // Définir la date par défaut (10 jours)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 10);
    
    const dateInput = document.getElementById('dateRendezVous');
    if (dateInput) {
        // Formater la date pour l'input datetime-local
        const formattedDate = defaultDate.toISOString().slice(0, 16);
        dateInput.value = formattedDate;
        
        // Afficher la date proposée
        const dateProposee = document.getElementById('dateProposee');
        if (dateProposee) {
            dateProposee.textContent = defaultDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
}

function setupEventListeners() {
    // Recherche de clients
    const searchInput = document.getElementById('searchClient');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filterClients(e.target.value);
        });
    }

    // Soumission du formulaire
    const form = document.getElementById('rendezvousForm');
    if (form) {
        form.addEventListener('submit', handleRendezVousSubmit);
    }
}

// === AFFICHAGE CLIENTS ===
function displayClients(clients) {
    const clientsGrid = document.getElementById('clientsGrid');
    if (!clientsGrid) return;

    clientsGrid.innerHTML = '';

    if (!clients || clients.length === 0) {
        clientsGrid.innerHTML = `
            <div class="col-12 text-center py-4">
                <i class="bx bx-user-x bx-lg text-muted mb-2"></i>
                <p class="text-muted">Aucun client trouvé</p>
                <small class="text-muted">Les clients apparaîtront ici après leur création</small>
            </div>
        `;
        return;
    }

    clients.forEach(client => {
        const clientCard = createClientCard(client);
        clientsGrid.appendChild(clientCard);
    });

    console.log('📋 Clients affichés:', clients.length);
}

function createClientCard(client) {
    const colDiv = document.createElement('div');
    colDiv.className = 'col-md-6 col-lg-4 mb-3';

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card client-card radius-10 cursor-pointer';
    cardDiv.style.transition = 'all 0.3s ease';
    
    const hasMesures = client.derniereMesure != null;
    const mesuresText = hasMesures ? 'Mesures' : 'Aucune mesure';
    
    cardDiv.innerHTML = `
        <div class="card-body">
            <div class="d-flex align-items-center mb-2">
                <div class="flex-shrink-0">
                    <div class="rounded-circle bg-light text-center d-flex align-items-center justify-content-center" 
                         style="width: 50px; height: 50px;">
                        <i class="bx bx-user text-muted"></i>
                    </div>
                </div>
                <div class="flex-grow-1 ms-3">
                    <h6 class="mb-0 fw-bold">${client.prenom} ${client.nom}</h6>
                    <small class="text-muted">${client.contact}</small>
                </div>
            </div>
            <div class="mt-2">
                <span class="badge bg-light-info text-info badge-sm me-1">
                    <i class="bx bx-ruler me-1"></i>${mesuresText}
                </span>
                <span class="badge bg-light-warning text-warning badge-sm">
                    <i class="bx bx-t-shirt me-1"></i>${client.nombreModelesEnCours || 0} modèle(s)
                </span>
            </div>
            ${hasMesures ? `
            <div class="mt-2 small text-muted">
                <i class="bx bx-calendar me-1"></i>
                Dernière mesure: ${new Date(client.derniereMesure.dateMesure).toLocaleDateString('fr-FR')}
            </div>
            ` : ''}
        </div>
    `;

    // Événement de clic
    cardDiv.addEventListener('click', () => selectClient(client));

    colDiv.appendChild(cardDiv);
    return colDiv;
}

// === SÉLECTION CLIENT ===
async function selectClient(client) {
    console.log('🎯 Client sélectionné:', client);
    
    // Retirer la sélection précédente
    document.querySelectorAll('.client-card').forEach(card => {
        card.classList.remove('selected', 'border-primary');
    });
    
    // Ajouter la sélection actuelle
    event.currentTarget.classList.add('selected', 'border-primary');
    event.currentTarget.style.borderWidth = '2px';
    
    selectedClient = client;
    
    try {
        Common.showLoading('Chargement des détails...');
        const clientDetails = await loadClientDetails(client.id);
        if (clientDetails) {
            displayClientDetails(clientDetails);
        }
        Common.hideLoading();
    } catch (error) {
        console.error('Erreur chargement détails client:', error);
        Common.hideLoading();
        Common.showErrorMessage('Erreur lors du chargement des détails du client');
    }
}

function displayClientDetails(client) {
    const clientInfoSection = document.getElementById('clientInfoSection');
    const clientName = document.getElementById('clientName');
    const clientContact = document.getElementById('clientContact');

    // Afficher la section
    if (clientInfoSection) {
        clientInfoSection.style.display = 'block';
    }

    // Informations de base
    if (clientName) {
        clientName.textContent = `${client.prenom} ${client.nom}`;
    }
    if (clientContact) {
        clientContact.innerHTML = `
            <i class="bx bx-phone me-1"></i>${client.contact}<br>
            <i class="bx bx-envelope me-1"></i>${client.adresse}
        `;
    }

    // Afficher les mesures
    displayMesures(client.mesures);
    
    // Afficher les modèles
    displayModeles(client.mesures);
}

function displayMesures(mesures) {
    const mesuresList = document.getElementById('mesuresList');
    const datePriseMesure = document.getElementById('datePriseMesure');

    if (!mesuresList) return;

    if (!mesures || mesures.length === 0) {
        mesuresList.innerHTML = '<p class="text-muted small">Aucune mesure disponible</p>';
        if (datePriseMesure) {
            datePriseMesure.innerHTML = '<i class="bx bx-calendar me-1"></i>Date de prise: Non disponible';
        }
        return;
    }

    // Prendre la dernière mesure
    const derniereMesure = mesures[mesures.length - 1];
    
    const mesuresHTML = `
        <div class="row g-2">
            <div class="col-6">
                <div class="d-flex justify-content-between">
                    <small class="text-muted">Épaules:</small>
                    <small class="fw-bold">${derniereMesure.epaule || 'N/A'} cm</small>
                </div>
                <div class="d-flex justify-content-between">
                    <small class="text-muted">Poitrine:</small>
                    <small class="fw-bold">${derniereMesure.poitrine || 'N/A'} cm</small>
                </div>
                <div class="d-flex justify-content-between">
                    <small class="text-muted">Taille:</small>
                    <small class="fw-bold">${derniereMesure.taille || 'N/A'} cm</small>
                </div>
            </div>
            <div class="col-6">
                <div class="d-flex justify-content-between">
                    <small class="text-muted">Longueur:</small>
                    <small class="fw-bold">${derniereMesure.longueur || 'N/A'} cm</small>
                </div>
                <div class="d-flex justify-content-between">
                    <small class="text-muted">Manches:</small>
                    <small class="fw-bold">${derniereMesure.manche || 'N/A'} cm</small>
                </div>
                <div class="d-flex justify-content-between">
                    <small class="text-muted">Prix:</small>
                    <small class="fw-bold text-success">${derniereMesure.prix ? new Intl.NumberFormat('fr-FR').format(derniereMesure.prix) + ' FCFA' : 'N/A'}</small>
                </div>
            </div>
        </div>
    `;

    mesuresList.innerHTML = mesuresHTML;

    // Date de prise
    if (datePriseMesure && derniereMesure.dateMesure) {
        const date = new Date(derniereMesure.dateMesure);
        datePriseMesure.innerHTML = `<i class="bx bx-calendar me-1"></i>Date de prise: ${date.toLocaleDateString('fr-FR')}`;
    }
}

function displayModeles(mesures) {
    const modelesList = document.getElementById('modelesList');
    if (!modelesList) return;

    // Filtrer les mesures qui ont un prix (considérées comme des modèles)
    const modeles = mesures.filter(mesure => mesure.prix && mesure.prix > 0);

    if (modeles.length === 0) {
        modelesList.innerHTML = '<p class="text-muted small">Aucun modèle en cours</p>';
        return;
    }

    let modelesHTML = '';
    modeles.forEach((modele, index) => {
        const prixFormatted = new Intl.NumberFormat('fr-FR').format(modele.prix);
        
        modelesHTML += `
            <div class="col-12">
                <div class="card border shadow-none mb-2">
                    <div class="card-body py-2">
                        <div class="d-flex align-items-center">
                            <div class="flex-shrink-0 me-3">
                                <div class="rounded bg-light d-flex align-items-center justify-content-center" 
                                     style="width: 60px; height: 60px;">
                                    <i class="bx bx-t-shirt text-muted"></i>
                                </div>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="mb-1 fw-bold" style="font-size: 0.85rem;">
                                    ${modele.typeVetement || 'Modèle'} ${index + 1}
                                </h6>
                                <p class="mb-1" style="font-size: 0.75rem;">
                                    <small class="text-muted">${modele.sexe === 'HOMME' ? 'Homme' : 'Femme'} • ${modele.typeVetement || 'Non spécifié'}</small>
                                </p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="fw-bold text-primary" style="font-size: 0.8rem;">${prixFormatted} FCFA</span>
                                    <span class="badge bg-light-success text-success" style="font-size: 0.7rem;">En Cours</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    modelesList.innerHTML = modelesHTML;
}

function filterClients(searchTerm) {
    const clientCards = document.querySelectorAll('.client-card');
    
    clientCards.forEach(card => {
        const clientName = card.querySelector('h6').textContent.toLowerCase();
        if (clientName.includes(searchTerm.toLowerCase()) || searchTerm === '') {
            card.parentElement.style.display = 'block';
        } else {
            card.parentElement.style.display = 'none';
        }
    });
}

// === GESTION RENDEZ-VOUS ===
async function handleRendezVousSubmit(event) {
    event.preventDefault();
    
    if (!selectedClient) {
        Common.showErrorMessage('Veuillez sélectionner un client');
        return;
    }

    const dateInput = document.getElementById('dateRendezVous').value;
    const typeInput = document.getElementById('typeRendezVous').value;

    if (!dateInput || !typeInput) {
        Common.showErrorMessage('Veuillez remplir tous les champs obligatoires');
        return;
    }

    const formData = {
        clientId: selectedClient.id,
        atelierId: currentAtelierId,
        dateRDV: dateInput,
        typeRendezVous: typeInput,
        notes: document.getElementById('notes').value || ''
    };

    console.log('📤 Données du rendez-vous:', formData);
    
    try {
        Common.showLoading('Création du rendez-vous...');
        const result = await creerRendezVous(formData);
        
        Common.showSuccessMessage('Rendez-vous planifié avec succès ! Un email de confirmation a été envoyé au client.');
        resetForm();
        loadRendezVousAVenir();
        Common.hideLoading();
    } catch (error) {
        console.error('Erreur création rendez-vous:', error);
        Common.hideLoading();
        Common.showErrorMessage('Erreur lors de la création du rendez-vous');
    }
}

function displayRendezVous(rendezVousList) {
    const rendezvousList = document.getElementById('rendezvousList');
    if (!rendezvousList) return;

    if (!rendezVousList || rendezVousList.length === 0) {
        rendezvousList.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="bx bx-calendar-x bx-lg mb-2"></i><br>
                    Aucun rendez-vous planifié
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    rendezVousList.forEach(rdv => {
        const date = new Date(rdv.dateRDV);
        const statutClass = getRdvStatutClass(rdv.statut);
        const typeIcon = getTypeIcon(rdv.typeRendezVous);
        
        html += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div><i class="bx bx-user-circle me-2 text-primary"></i></div>
                        <div>${rdv.clientNomComplet}</div>
                    </div>
                </td>
                <td>
                    <div>${date.toLocaleDateString('fr-FR')}</div>
                    <small class="text-muted">${date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</small>
                </td>
                <td>
                    <span class="badge bg-primary">${typeIcon} ${rdv.typeRendezVous}</span>
                </td>
                <td>${rdv.modeleType || 'N/A'}</td>
                <td>
                    <span class="badge ${statutClass}">${rdv.statut}</span>
                </td>
                <td>
                    <div class="d-flex order-actions">
                        ${rdv.statut === 'PLANIFIE' ? `
                        <button class="btn btn-sm btn-outline-success me-1" onclick="confirmerRendezVousAction('${rdv.id}')" title="Confirmer">
                            <i class="bx bx-check"></i>
                        </button>
                        ` : ''}
                        ${rdv.statut !== 'TERMINE' && rdv.statut !== 'ANNULE' ? `
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editerRendezVousAction('${rdv.id}')" title="Modifier">
                            <i class="bx bx-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="annulerRendezVousAction('${rdv.id}')" title="Annuler">
                            <i class="bx bx-x"></i>
                        </button>
                        ` : ''}
                        ${rdv.statut === 'CONFIRME' ? `
                        <button class="btn btn-sm btn-outline-info me-1" onclick="terminerRendezVousAction('${rdv.id}')" title="Terminer">
                            <i class="bx bx-calendar-check"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    rendezvousList.innerHTML = html;
}

// === ACTIONS RENDEZ-VOUS ===
async function confirmerRendezVousAction(rendezVousId) {
    if (!confirm('Confirmer ce rendez-vous ? Un email sera envoyé au client.')) return;
    
    try {
        Common.showLoading('Confirmation du rendez-vous...');
        await confirmerRendezVous(rendezVousId);
        Common.showSuccessMessage('Rendez-vous confirmé avec succès !');
        loadRendezVousAVenir();
        Common.hideLoading();
    } catch (error) {
        console.error('Erreur confirmation:', error);
        Common.hideLoading();
        Common.showErrorMessage('Erreur lors de la confirmation du rendez-vous');
    }
}

async function annulerRendezVousAction(rendezVousId) {
    if (!confirm('Annuler ce rendez-vous ? Un email sera envoyé au client.')) return;
    
    try {
        Common.showLoading('Annulation du rendez-vous...');
        await annulerRendezVous(rendezVousId);
        Common.showSuccessMessage('Rendez-vous annulé avec succès !');
        loadRendezVousAVenir();
        Common.hideLoading();
    } catch (error) {
        console.error('Erreur annulation:', error);
        Common.hideLoading();
        Common.showErrorMessage('Erreur lors de l\'annulation du rendez-vous');
    }
}

async function terminerRendezVousAction(rendezVousId) {
    if (!confirm('Marquer ce rendez-vous comme terminé ?')) return;
    
    try {
        Common.showLoading('Marquage comme terminé...');
        await terminerRendezVous(rendezVousId);
        Common.showSuccessMessage('Rendez-vous marqué comme terminé !');
        loadRendezVousAVenir();
        Common.hideLoading();
    } catch (error) {
        console.error('Erreur terminaison:', error);
        Common.hideLoading();
        Common.showErrorMessage('Erreur lors du marquage du rendez-vous');
    }
}

function editerRendezVousAction(rendezVousId) {
    Common.showInfoMessage('Fonction d\'édition à implémenter');
    console.log('Édition du rendez-vous:', rendezVousId);
}

// === FONCTIONS UTILITAIRES ===
function getRdvStatutClass(statut) {
    const classes = {
        'PLANIFIE': 'bg-light-warning text-warning',
        'CONFIRME': 'bg-light-success text-success',
        'ANNULE': 'bg-light-danger text-danger',
        'TERMINE': 'bg-light-info text-info'
    };
    return classes[statut] || 'bg-light-secondary text-secondary';
}

function getTypeIcon(type) {
    const icons = {
        'LIVRAISON': '🚚',
        'RETOUCHE': '✂️',
        // 'ESSAYAGE': '👔',
        // 'MESURE': '📏'
    };
    return icons[type] || '📅';
}

function resetForm() {
    document.getElementById('rendezvousForm').reset();
    document.getElementById('clientInfoSection').style.display = 'none';
    selectedClient = null;
    
    // Réinitialiser la sélection des clients
    document.querySelectorAll('.client-card').forEach(card => {
        card.classList.remove('selected');
        card.style.borderColor = '';
    });
    
    // Réinitialiser la date par défaut
    initializeRendezVous();
}

function showNouveauRendezVous() {
    resetForm();
    document.getElementById('nouveauRendezVousSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

console.log('✅ Module rendez-vous API réelle chargé');