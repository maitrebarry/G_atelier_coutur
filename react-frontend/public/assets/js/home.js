// // dashboard.js - Version complète corrigée

// const API_BASE_URL = 'http://localhost:8081/api';

// // Variables globales
// let currentDashboardData = null;
// let currentPeriode = 'mois';

// // Initialisation
// document.addEventListener('DOMContentLoaded', function() {
//     console.log('🚀 Initialisation du dashboard');
    
//     // Vérifier que Chart.js est disponible
//     if (typeof Chart === 'undefined') {
//         console.error('❌ Chart.js non chargé');
//         Common.showErrorMessage('Erreur de chargement des graphiques');
//         return;
//     }
    
//     // Vérifier l'authentification
//     if (!Common.isAuthenticated()) {
//         window.location.href = 'index.html';
//         return;
//     }

//     // Charger les données du dashboard
//     loadDashboardData();
    
//     // Configurer les dates par défaut
//     setupDefaultDates();
// });

// // === FONCTIONS API ===
// async function apiCall(endpoint, options = {}) {
//     try {
//         const token = Common.getToken();
//         const headers = {
//             'Content-Type': 'application/json',
//             ...(token && { 'Authorization': `Bearer ${token}` }),
//             ...options.headers
//         };

//         const response = await fetch(`${API_BASE_URL}${endpoint}`, {
//             ...options,
//             headers
//         });

//         if (!response.ok) {
//             throw new Error(`HTTP ${response.status}`);
//         }

//         return await response.json();
//     } catch (error) {
//         console.error(`❌ Erreur API ${endpoint}:`, error);
//         throw error;
//     }
// }

// // Charger les données du dashboard
// async function loadDashboardData() {
//     try {
//         Common.showLoading('Chargement du dashboard...');
        
//         const dashboardData = await apiCall('/dashboard');
//         currentDashboardData = dashboardData;
        
//         displayDashboardData(dashboardData);
//         Common.hideLoading();
        
//     } catch (error) {
//         console.error('Erreur chargement dashboard:', error);
//         Common.hideLoading();
//         Common.showErrorMessage('Erreur lors du chargement du dashboard: ' + error.message);
//     }
// }

// // Afficher les données du dashboard
// function displayDashboardData(data) {
//     console.log('📊 Données du dashboard:', data);
    
//     // Afficher les statistiques principales
//     displayStatsCards(data);
    
//     // Afficher le contenu selon le type de dashboard
//     if (data.totalAteliers !== undefined) {
//         displaySuperAdminDashboard(data);
//     } else if (data.chiffreAffairesMensuel !== undefined) {
//         displayProprietaireDashboard(data);
//     } else if (data.affectationsEnAttente !== undefined) {
//         displayTailleurDashboard(data);
//     } else if (data.nouveauxClientsSemaine !== undefined) {
//         displaySecretaireDashboard(data);
//     }
// }

// // === AFFICHAGE DES STATISTIQUES ===
// function displayStatsCards(data) {
//     const statsContainer = document.getElementById('statsContainer');
    
//     if (!statsContainer) {
//         console.error('❌ Conteneur stats non trouvé');
//         return;
//     }

//     if (data.totalAteliers !== undefined) {
//         // Super Admin
//         statsContainer.innerHTML = `
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${data.totalAteliers || 0}</h4>
//                                 <span class="text-muted">Ateliers</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-store-alt text-primary h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card success">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${data.totalUtilisateurs || 0}</h4>
//                                 <span class="text-muted">Utilisateurs</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-user-circle text-success h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card warning">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${data.totalClients || 0}</h4>
//                                 <span class="text-muted">Clients</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-group text-warning h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card info">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${formatCurrency(data.chiffreAffairesTotal || 0)}</h4>
//                                 <span class="text-muted">Chiffre d'affaires</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-money text-info h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;
//     } else if (data.chiffreAffairesMensuel !== undefined) {
//         // Propriétaire
//         statsContainer.innerHTML = `
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${formatCurrency(data.chiffreAffairesMensuel || 0)}</h4>
//                                 <span class="text-muted">CA Mensuel</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-money text-primary h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card success">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${data.affectationsEnCours || 0}</h4>
//                                 <span class="text-muted">Commandes en cours</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-clipboard text-success h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card warning">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${data.totalClients || 0}</h4>
//                                 <span class="text-muted">Clients</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-group text-warning h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card info">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${data.totalTailleurs || 0}</h4>
//                                 <span class="text-muted">Tailleurs</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-user text-info h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;
//     } else if (data.affectationsEnAttente !== undefined) {
//         // Tailleur
//         statsContainer.innerHTML = `
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${data.affectationsEnAttente || 0}</h4>
//                                 <span class="text-muted">En attente</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-time-five text-primary h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card success">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${data.affectationsEnCours || 0}</h4>
//                                 <span class="text-muted">En cours</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-cog text-success h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card warning">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${data.affectationsTermineesSemaine || 0}</h4>
//                                 <span class="text-muted">Terminées (7j)</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-check-circle text-warning h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card info">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${formatCurrency(data.revenusMensuels || 0)}</h4>
//                                 <span class="text-muted">Revenus mensuels</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-money text-info h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;
//     } else if (data.nouveauxClientsSemaine !== undefined) {
//         // Secrétaire
//         statsContainer.innerHTML = `
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${data.rendezVousAujourdhui || 0}</h4>
//                                 <span class="text-muted">RDV Aujourd'hui</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-calendar text-primary h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card success">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${data.nouveauxClientsSemaine || 0}</h4>
//                                 <span class="text-muted">Nouveaux clients</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-user-plus text-success h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card warning">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${data.affectationsEnAttente || 0}</h4>
//                                 <span class="text-muted">Affectations en attente</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-clipboard text-warning h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-xl-3 col-md-6">
//                 <div class="card card-hover stat-card info">
//                     <div class="card-body">
//                         <div class="d-flex align-items-center">
//                             <div class="flex-grow-1">
//                                 <h4 class="mb-0">${data.paiementsAttente || 0}</h4>
//                                 <span class="text-muted">Paiements en attente</span>
//                             </div>
//                             <div class="flex-shrink-0">
//                                 <i class="bx bx-credit-card text-info h1"></i>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;
//     }
// }

// // === AFFICHAGE PAR RÔLE ===
// function displaySuperAdminDashboard(data) {
//     const element = document.getElementById('superAdminContent');
//     if (element) element.style.display = 'block';
//     initializeSuperAdminCharts(data);
// }

// function displayProprietaireDashboard(data) {
//     const element = document.getElementById('proprietaireContent');
//     if (element) element.style.display = 'block';
    
//     if (data.performanceTailleurs && data.performanceTailleurs.length > 0) {
//         displayPerformanceTailleurs(data.performanceTailleurs);
//     }
    
//     if (data.rendezVousProchains && data.rendezVousProchains.length > 0) {
//         displayRendezVousProchains(data.rendezVousProchains);
//     }
    
//     if (data.tachesUrgentes && data.tachesUrgentes.length > 0) {
//         displayTachesUrgentes(data.tachesUrgentes);
//     }
    
//     if (data.affectationsParStatut && typeof Chart !== 'undefined') {
//         setTimeout(() => initializeAffectationsChart(data.affectationsParStatut), 100);
//     }
// }

// function displayTailleurDashboard(data) {
//     const element = document.getElementById('tailleurContent');
//     if (element) element.style.display = 'block';
    
//     // Afficher les statistiques de performance
//     const tauxCompletion = document.getElementById('tauxCompletion');
//     const moyenneTemps = document.getElementById('moyenneTemps');
//     const revenusMensuels = document.getElementById('revenusMensuels');
//     const revenusAttente = document.getElementById('revenusAttente');
    
//     if (tauxCompletion) tauxCompletion.textContent = Math.round(data.tauxCompletion || 0) + '%';
//     if (moyenneTemps) moyenneTemps.textContent = Math.round(data.moyenneTempsRealisation || 0) + 'h';
//     if (revenusMensuels) revenusMensuels.textContent = formatCurrency(data.revenusMensuels || 0);
//     if (revenusAttente) revenusAttente.textContent = formatCurrency(data.revenusEnAttente || 0);
    
//     // Afficher les affectations en cours
//     if (data.affectationsEnCoursList && data.affectationsEnCoursList.length > 0) {
//         displayAffectationsEnCours(data.affectationsEnCoursList);
//     }
    
//     // Afficher les prochaines échéances
//     if (data.prochainesEcheances && data.prochainesEcheances.length > 0) {
//         displayProchainesEcheances(data.prochainesEcheances);
//     }
// }

// function displaySecretaireDashboard(data) {
//     const element = document.getElementById('secretaireContent');
//     if (element) element.style.display = 'block';
    
//     if (data.rendezVousAujourdhuiList && data.rendezVousAujourdhuiList.length > 0) {
//         displayRdvAujourdhui(data.rendezVousAujourdhuiList);
//     }
    
//     if (data.clientsRecents && data.clientsRecents.length > 0) {
//         displayClientsRecents(data.clientsRecents);
//     }
    
//     if (data.tachesDuJour && data.tachesDuJour.length > 0) {
//         displayTachesDuJour(data.tachesDuJour);
//     }
    
//     if (data.paiementsEnAttente && data.paiementsEnAttente.length > 0) {
//         displayPaiementsAttente(data.paiementsEnAttente);
//     }
// }

// // === FONCTIONS D'AFFICHAGE DÉTAILLÉ - TOUTES LES FONCTIONS MANQUANTES ===

// function displayPerformanceTailleurs(performances) {
//     const container = document.getElementById('performanceTailleursList');
//     if (!container) return;
    
//     let html = '';
//     performances.forEach(perf => {
//         html += `
//             <div class="d-flex justify-content-between align-items-center mb-3 p-2 border rounded">
//                 <div>
//                     <h6 class="mb-1">${perf.nomTailleur || 'Tailleur'}</h6>
//                     <small class="text-muted">
//                         ${perf.affectationsTerminees || 0} terminées • ${perf.affectationsEnRetard || 0} retards
//                     </small>
//                 </div>
//                 <div class="text-end">
//                     <div class="fw-bold text-primary">${Math.round(perf.satisfactionMoyenne || 0)}%</div>
//                     <small class="text-muted">Satisfaction</small>
//                 </div>
//             </div>
//         `;
//     });
    
//     container.innerHTML = html || '<p class="text-muted">Aucune donnée de performance</p>';
// }

// function displayRendezVousProchains(rendezVous) {
//     const container = document.getElementById('rendezVousProchainsList');
//     if (!container) return;
    
//     let html = '';
//     rendezVous.forEach(rdv => {
//         const date = new Date(rdv.date);
//         html += `
//             <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
//                 <div>
//                     <h6 class="mb-1">${rdv.clientNom || 'Client'}</h6>
//                     <small class="text-muted">
//                         ${date.toLocaleDateString('fr-FR')} - ${rdv.type || 'Rendez-vous'}
//                     </small>
//                 </div>
//                 <span class="badge bg-${getRdvStatusColor(rdv.statut)}">${rdv.statut || 'PLANIFIE'}</span>
//             </div>
//         `;
//     });
    
//     container.innerHTML = html || '<p class="text-muted">Aucun rendez-vous à venir</p>';
// }

// function displayTachesUrgentes(taches) {
//     const container = document.getElementById('tachesUrgentesList');
//     if (!container) return;
    
//     let html = '';
//     taches.forEach(tache => {
//         html += `
//             <div class="alert alert-${getTachePriorityColor(tache.priorite)} mb-2">
//                 <div class="d-flex justify-content-between align-items-center">
//                     <span>${tache.description || 'Tâche urgente'}</span>
//                     <small class="text-muted">${tache.type || 'URGENT'}</small>
//                 </div>
//             </div>
//         `;
//     });
    
//     container.innerHTML = html || '<p class="text-muted">Aucune tâche urgente</p>';
// }

// function displayAffectationsEnCours(affectations) {
//     const container = document.getElementById('affectationsEnCoursList');
//     if (!container) return;
    
//     let html = '';
//     affectations.forEach(aff => {
//         html += `
//             <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
//                 <div>
//                     <h6 class="mb-1">${aff.clientNom || 'Client'}</h6>
//                     <small class="text-muted">${aff.typeVetement || 'Modèle'}</small>
//                 </div>
//                 <div class="text-end">
//                     <small class="text-muted d-block">Échéance: ${formatDate(aff.dateEcheance)}</small>
//                     <span class="badge bg-${getAffectationStatusColor(aff.statut)}">${aff.statut || 'EN_COURS'}</span>
//                 </div>
//             </div>
//         `;
//     });
    
//     container.innerHTML = html || '<p class="text-muted">Aucune affectation en cours</p>';
// }

// function displayProchainesEcheances(echeances) {
//     const container = document.getElementById('prochainesEcheancesList');
//     if (!container) return;
    
//     let html = '';
//     echeances.forEach(echeance => {
//         const joursRestants = echeance.joursRestants || 0;
//         const badgeColor = joursRestants <= 2 ? 'danger' : joursRestants <= 5 ? 'warning' : 'info';
        
//         html += `
//             <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
//                 <div>
//                     <h6 class="mb-1">${echeance.clientNom || 'Client'}</h6>
//                     <small class="text-muted">${echeance.typeVetement || 'Modèle'}</small>
//                 </div>
//                 <div class="text-end">
//                     <small class="text-muted d-block">${formatDate(echeance.dateEcheance)}</small>
//                     <span class="badge bg-${badgeColor}">${joursRestants} jour(s)</span>
//                 </div>
//             </div>
//         `;
//     });
    
//     container.innerHTML = html || '<p class="text-muted">Aucune échéance prochaine</p>';
// }

// function displayRdvAujourdhui(rendezVous) {
//     const container = document.getElementById('rdvAujourdhuiList');
//     if (!container) return;
    
//     let html = '';
//     rendezVous.forEach(rdv => {
//         const date = new Date(rdv.dateHeure);
//         html += `
//             <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
//                 <div>
//                     <h6 class="mb-1">${rdv.clientNom || 'Client'}</h6>
//                     <small class="text-muted">
//                         ${date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})} - ${rdv.type || 'RDV'}
//                     </small>
//                 </div>
//                 <span class="badge bg-${getRdvStatusColor(rdv.statut)}">${rdv.statut || 'PLANIFIE'}</span>
//             </div>
//         `;
//     });
    
//     container.innerHTML = html || '<p class="text-muted">Aucun rendez-vous aujourd\'hui</p>';
// }

// function displayClientsRecents(clients) {
//     const container = document.getElementById('clientsRecentsList');
//     if (!container) return;
    
//     let html = '';
//     clients.forEach(client => {
//         const date = new Date(client.dateCreation);
//         html += `
//             <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
//                 <div>
//                     <h6 class="mb-1">${client.nomComplet || 'Client'}</h6>
//                     <small class="text-muted">${client.contact || 'Non renseigné'}</small>
//                 </div>
//                 <div class="text-end">
//                     <small class="text-muted d-block">${date.toLocaleDateString('fr-FR')}</small>
//                     <span class="badge bg-secondary">${client.totalCommandes || 0} cmd</span>
//                 </div>
//             </div>
//         `;
//     });
    
//     container.innerHTML = html || '<p class="text-muted">Aucun client récent</p>';
// }

// function displayTachesDuJour(taches) {
//     const container = document.getElementById('tachesDuJourList');
//     if (!container) return;
    
//     let html = '';
//     taches.forEach(tache => {
//         const echeance = tache.echeance ? new Date(tache.echeance) : null;
//         html += `
//             <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded ${tache.termine ? 'bg-light' : ''}">
//                 <div class="flex-grow-1">
//                     <h6 class="mb-1 ${tache.termine ? 'text-muted text-decoration-line-through' : ''}">
//                         ${tache.description || 'Tâche'}
//                     </h6>
//                     ${echeance ? `<small class="text-muted">Avant ${echeance.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</small>` : ''}
//                 </div>
//                 <div class="form-check form-switch">
//                     <input class="form-check-input" type="checkbox" ${tache.termine ? 'checked' : ''}>
//                 </div>
//             </div>
//         `;
//     });
    
//     container.innerHTML = html || '<p class="text-muted">Aucune tâche pour aujourd\'hui</p>';
// }

// function displayPaiementsAttente(paiements) {
//     const container = document.getElementById('paiementsAttenteList');
//     if (!container) return;
    
//     let html = '';
//     paiements.forEach(paiement => {
//         const date = new Date(paiement.dateEcheance);
//         html += `
//             <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
//                 <div>
//                     <h6 class="mb-1">${paiement.clientNom || 'Client'}</h6>
//                     <small class="text-muted">${paiement.typeVetement || 'Modèle'}</small>
//                 </div>
//                 <div class="text-end">
//                     <div class="fw-bold text-warning">${formatCurrency(paiement.montant || 0)}</div>
//                     <small class="text-muted">${date.toLocaleDateString('fr-FR')}</small>
//                 </div>
//             </div>
//         `;
//     });
    
//     container.innerHTML = html || '<p class="text-muted">Aucun paiement en attente</p>';
// }

// // === FONCTIONS UTILITAIRES ===
// function formatCurrency(amount) {
//     return new Intl.NumberFormat('fr-FR', {
//         style: 'currency',
//         currency: 'XOF'
//     }).format(amount);
// }

// function formatDate(dateString) {
//     if (!dateString) return 'Non définie';
//     try {
//         const date = new Date(dateString);
//         return date.toLocaleDateString('fr-FR');
//     } catch (e) {
//         return 'Date invalide';
//     }
// }

// function getRdvStatusColor(statut) {
//     const colors = {
//         'PLANIFIE': 'warning',
//         'CONFIRME': 'success',
//         'ANNULE': 'danger',
//         'TERMINE': 'info'
//     };
//     return colors[statut] || 'secondary';
// }

// function getAffectationStatusColor(statut) {
//     const colors = {
//         'EN_ATTENTE': 'warning',
//         'EN_COURS': 'primary',
//         'TERMINE': 'success',
//         'VALIDE': 'info',
//         'ANNULE': 'danger'
//     };
//     return colors[statut] || 'secondary';
// }

// function getTachePriorityColor(priorite) {
//     const colors = {
//         'HAUTE': 'danger',
//         'MOYENNE': 'warning',
//         'BASSE': 'info'
//     };
//     return colors[priorite] || 'secondary';
// }

// // === GRAPHIQUES ===
// function initializeAffectationsChart(repartition) {
//     try {
//         const ctx = document.getElementById('affectationsChart');
//         if (!ctx) return;

//         const labels = Object.keys(repartition || {});
//         const data = Object.values(repartition || {});
        
//         if (labels.length === 0) return;

//         const colors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d'];
        
//         new Chart(ctx, {
//             type: 'doughnut',
//             data: {
//                 labels: labels,
//                 datasets: [{
//                     data: data,
//                     backgroundColor: colors,
//                     borderWidth: 1
//                 }]
//             },
//             options: {
//                 responsive: true,
//                 plugins: {
//                     legend: {
//                         position: 'bottom'
//                     }
//                 }
//             }
//         });
//     } catch (error) {
//         console.error('❌ Erreur graphique affectations:', error);
//     }
// }

// function initializeSuperAdminCharts(data) {
//     try {
//         const caCtx = document.getElementById('chiffreAffairesChart');
//         if (caCtx) {
//             new Chart(caCtx, {
//                 type: 'line',
//                 data: {
//                     labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
//                     datasets: [{
//                         label: 'Chiffre d\'affaires',
//                         data: [120000, 190000, 150000, 180000, 220000, 250000],
//                         borderColor: '#0d6efd',
//                         backgroundColor: 'rgba(13, 110, 253, 0.1)',
//                         tension: 0.4
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     plugins: {
//                         title: {
//                             display: true,
//                             text: 'Évolution du chiffre d\'affaires'
//                         }
//                     }
//                 }
//             });
//         }
//     } catch (error) {
//         console.error('❌ Erreur graphiques SuperAdmin:', error);
//     }
// }

// // === GESTION DE LA PÉRIODE ===
// function setupDefaultDates() {
//     const today = new Date();
//     const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
//     const dateDebut = document.getElementById('dateDebut');
//     const dateFin = document.getElementById('dateFin');
    
//     if (dateDebut) dateDebut.value = firstDay.toISOString().split('T')[0];
//     if (dateFin) dateFin.value = today.toISOString().split('T')[0];
// }

// function togglePeriode() {
//     const section = document.getElementById('periodeSection');
//     if (section) {
//         section.style.display = section.style.display === 'none' ? 'block' : 'none';
//     }
// }

// function appliquerPeriode() {
//     const dateDebut = document.getElementById('dateDebut');
//     const dateFin = document.getElementById('dateFin');
    
//     if (!dateDebut || !dateFin || !dateDebut.value || !dateFin.value) {
//         Common.showErrorMessage('Veuillez sélectionner une période complète');
//         return;
//     }
    
//     currentPeriode = 'personnalisee';
//     const periodeText = document.getElementById('periodeText');
//     if (periodeText) periodeText.textContent = 'Période personnalisée';
    
//     const periodeSection = document.getElementById('periodeSection');
//     if (periodeSection) periodeSection.style.display = 'none';
    
//     loadDashboardWithPeriode(dateDebut.value, dateFin.value);
// }

// async function loadDashboardWithPeriode(dateDebut, dateFin) {
//     try {
//         Common.showLoading('Chargement des données...');
        
//         const userData = Common.getUserData();
//         const atelierId = userData.atelierId || userData.atelier?.id;
        
//         if (!atelierId) {
//             throw new Error('Atelier non disponible');
//         }
        
//         const stats = await apiCall(
//             `/dashboard/statistiques/${atelierId}?dateDebut=${dateDebut}&dateFin=${dateFin}`
//         );
        
//         updateStatsWithPeriode(stats);
//         Common.hideLoading();
        
//     } catch (error) {
//         console.error('Erreur chargement période:', error);
//         Common.hideLoading();
//         Common.showErrorMessage('Erreur lors du chargement des données de période');
//     }
// }

// function updateStatsWithPeriode(stats) {
//     console.log('📈 Statistiques période:', stats);
//     // Implémentez la mise à jour des statistiques avec les données de période
// }

// // === RAFRAÎCHISSEMENT ===
// function refreshDashboard() {
//     loadDashboardData();
// }

// // Auto-rafraîchissement
// setInterval(() => {
//     if (document.visibilityState === 'visible') {
//         refreshDashboard();
//     }
// }, 300000);

// document.addEventListener('visibilitychange', function() {
//     if (document.visibilityState === 'visible') {
//         refreshDashboard();
//     }
// });

// console.log('✅ Module dashboard chargé');

// dashboard.js - Version complète corrigée avec Common.apiCall

// Variables globales
let currentDashboardData = null;
let currentPeriode = 'mois';

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation du dashboard');
    
    // Vérifier que Chart.js est disponible
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js non chargé');
        Common.showErrorMessage('Erreur de chargement des graphiques');
        return;
    }
    
    // Vérifier l'authentification
    if (!Common.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Charger les données du dashboard
    loadDashboardData();
    
    // Configurer les dates par défaut
    setupDefaultDates();
});

// === FONCTIONS API ===
// ⚠️ SUPPRIMÉ : fonction apiCall locale - Utilisez Common.apiCall

// Charger les données du dashboard
async function loadDashboardData() {
    try {
        Common.showLoading('Chargement du dashboard...');
        
        // ✅ CORRECTION : Utiliser Common.apiCall avec le bon endpoint
        const dashboardData = await Common.apiCall('/api/dashboard');
        currentDashboardData = dashboardData;
        
        displayDashboardData(dashboardData);
        Common.hideLoading();
        
    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
        Common.hideLoading();
        Common.showErrorMessage('Erreur lors du chargement du dashboard: ' + error.message);
    }
}

// Afficher les données du dashboard
function displayDashboardData(data) {
    console.log('📊 Données du dashboard:', data);
    
    // Afficher les statistiques principales
    displayStatsCards(data);
    
    // Afficher le contenu selon le type de dashboard
    if (data.totalAteliers !== undefined) {
        displaySuperAdminDashboard(data);
    } else if (data.chiffreAffairesMensuel !== undefined) {
        displayProprietaireDashboard(data);
    } else if (data.affectationsEnAttente !== undefined) {
        displayTailleurDashboard(data);
    } else if (data.nouveauxClientsSemaine !== undefined) {
        displaySecretaireDashboard(data);
    }
}

// === AFFICHAGE DES STATISTIQUES ===
function displayStatsCards(data) {
    const statsContainer = document.getElementById('statsContainer');
    
    if (!statsContainer) {
        console.error('❌ Conteneur stats non trouvé');
        return;
    }

    if (data.totalAteliers !== undefined) {
        // Super Admin
        statsContainer.innerHTML = `
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${data.totalAteliers || 0}</h4>
                                <span class="text-muted">Ateliers</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-store-alt text-primary h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card success">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${data.totalUtilisateurs || 0}</h4>
                                <span class="text-muted">Utilisateurs</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-user-circle text-success h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card warning">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${data.totalClients || 0}</h4>
                                <span class="text-muted">Clients</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-group text-warning h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card info">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${formatCurrency(data.chiffreAffairesTotal || 0)}</h4>
                                <span class="text-muted">Chiffre d'affaires</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-money text-info h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (data.chiffreAffairesMensuel !== undefined) {
        // Propriétaire
        statsContainer.innerHTML = `
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${formatCurrency(data.chiffreAffairesMensuel || 0)}</h4>
                                <span class="text-muted">CA Mensuel</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-money text-primary h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card success">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${data.affectationsEnCours || 0}</h4>
                                <span class="text-muted">Commandes en cours</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-clipboard text-success h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card warning">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${data.totalClients || 0}</h4>
                                <span class="text-muted">Clients</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-group text-warning h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card info">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${data.totalTailleurs || 0}</h4>
                                <span class="text-muted">Tailleurs</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-user text-info h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (data.affectationsEnAttente !== undefined) {
        // Tailleur
        statsContainer.innerHTML = `
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${data.affectationsEnAttente || 0}</h4>
                                <span class="text-muted">En attente</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-time-five text-primary h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card success">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${data.affectationsEnCours || 0}</h4>
                                <span class="text-muted">En cours</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-cog text-success h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card warning">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${data.affectationsTermineesSemaine || 0}</h4>
                                <span class="text-muted">Terminées (7j)</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-check-circle text-warning h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card info">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${formatCurrency(data.revenusMensuels || 0)}</h4>
                                <span class="text-muted">Revenus mensuels</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-money text-info h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (data.nouveauxClientsSemaine !== undefined) {
        // Secrétaire
        statsContainer.innerHTML = `
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${data.rendezVousAujourdhui || 0}</h4>
                                <span class="text-muted">RDV Aujourd'hui</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-calendar text-primary h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card success">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${data.nouveauxClientsSemaine || 0}</h4>
                                <span class="text-muted">Nouveaux clients</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-user-plus text-success h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card warning">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${data.affectationsEnAttente || 0}</h4>
                                <span class="text-muted">Affectations en attente</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-clipboard text-warning h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="card card-hover stat-card info">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1">
                                <h4 class="mb-0">${data.paiementsAttente || 0}</h4>
                                <span class="text-muted">Paiements en attente</span>
                            </div>
                            <div class="flex-shrink-0">
                                <i class="bx bx-credit-card text-info h1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// === AFFICHAGE PAR RÔLE ===
function displaySuperAdminDashboard(data) {
    const element = document.getElementById('superAdminContent');
    if (element) element.style.display = 'block';
    initializeSuperAdminCharts(data);
}

function displayProprietaireDashboard(data) {
    const element = document.getElementById('proprietaireContent');
    if (element) element.style.display = 'block';
    
    if (data.performanceTailleurs && data.performanceTailleurs.length > 0) {
        displayPerformanceTailleurs(data.performanceTailleurs);
    }
    
    if (data.rendezVousProchains && data.rendezVousProchains.length > 0) {
        displayRendezVousProchains(data.rendezVousProchains);
    }
    
    if (data.tachesUrgentes && data.tachesUrgentes.length > 0) {
        displayTachesUrgentes(data.tachesUrgentes);
    }
    
    if (data.affectationsParStatut && typeof Chart !== 'undefined') {
        setTimeout(() => initializeAffectationsChart(data.affectationsParStatut), 100);
    }
}

function displayTailleurDashboard(data) {
    const element = document.getElementById('tailleurContent');
    if (element) element.style.display = 'block';
    
    // Afficher les statistiques de performance
    const tauxCompletion = document.getElementById('tauxCompletion');
    const moyenneTemps = document.getElementById('moyenneTemps');
    const revenusMensuels = document.getElementById('revenusMensuels');
    const revenusAttente = document.getElementById('revenusAttente');
    
    if (tauxCompletion) tauxCompletion.textContent = Math.round(data.tauxCompletion || 0) + '%';
    if (moyenneTemps) moyenneTemps.textContent = Math.round(data.moyenneTempsRealisation || 0) + 'h';
    if (revenusMensuels) revenusMensuels.textContent = formatCurrency(data.revenusMensuels || 0);
    if (revenusAttente) revenusAttente.textContent = formatCurrency(data.revenusEnAttente || 0);
    
    // Afficher les affectations en cours
    if (data.affectationsEnCoursList && data.affectationsEnCoursList.length > 0) {
        displayAffectationsEnCours(data.affectationsEnCoursList);
    }
    
    // Afficher les prochaines échéances
    if (data.prochainesEcheances && data.prochainesEcheances.length > 0) {
        displayProchainesEcheances(data.prochainesEcheances);
    }
}

function displaySecretaireDashboard(data) {
    const element = document.getElementById('secretaireContent');
    if (element) element.style.display = 'block';
    
    if (data.rendezVousAujourdhuiList && data.rendezVousAujourdhuiList.length > 0) {
        displayRdvAujourdhui(data.rendezVousAujourdhuiList);
    }
    
    if (data.clientsRecents && data.clientsRecents.length > 0) {
        displayClientsRecents(data.clientsRecents);
    }
    
    if (data.tachesDuJour && data.tachesDuJour.length > 0) {
        displayTachesDuJour(data.tachesDuJour);
    }
    
    if (data.paiementsEnAttente && data.paiementsEnAttente.length > 0) {
        displayPaiementsAttente(data.paiementsEnAttente);
    }
}

// === FONCTIONS D'AFFICHAGE DÉTAILLÉ ===

function displayPerformanceTailleurs(performances) {
    const container = document.getElementById('performanceTailleursList');
    if (!container) return;
    
    let html = '';
    performances.forEach(perf => {
        html += `
            <div class="d-flex justify-content-between align-items-center mb-3 p-2 border rounded">
                <div>
                    <h6 class="mb-1">${perf.nomTailleur || 'Tailleur'}</h6>
                    <small class="text-muted">
                        ${perf.affectationsTerminees || 0} terminées • ${perf.affectationsEnRetard || 0} retards
                    </small>
                </div>
                <div class="text-end">
                    <div class="fw-bold text-primary">${Math.round(perf.satisfactionMoyenne || 0)}%</div>
                    <small class="text-muted">Satisfaction</small>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p class="text-muted">Aucune donnée de performance</p>';
}

function displayRendezVousProchains(rendezVous) {
    const container = document.getElementById('rendezVousProchainsList');
    if (!container) return;
    
    let html = '';
    rendezVous.forEach(rdv => {
        const date = new Date(rdv.date);
        html += `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div>
                    <h6 class="mb-1">${rdv.clientNom || 'Client'}</h6>
                    <small class="text-muted">
                        ${date.toLocaleDateString('fr-FR')} - ${rdv.type || 'Rendez-vous'}
                    </small>
                </div>
                <span class="badge bg-${getRdvStatusColor(rdv.statut)}">${rdv.statut || 'PLANIFIE'}</span>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p class="text-muted">Aucun rendez-vous à venir</p>';
}

function displayTachesUrgentes(taches) {
    const container = document.getElementById('tachesUrgentesList');
    if (!container) return;
    
    let html = '';
    taches.forEach(tache => {
        html += `
            <div class="alert alert-${getTachePriorityColor(tache.priorite)} mb-2">
                <div class="d-flex justify-content-between align-items-center">
                    <span>${tache.description || 'Tâche urgente'}</span>
                    <small class="text-muted">${tache.type || 'URGENT'}</small>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p class="text-muted">Aucune tâche urgente</p>';
}

function displayAffectationsEnCours(affectations) {
    const container = document.getElementById('affectationsEnCoursList');
    if (!container) return;
    
    let html = '';
    affectations.forEach(aff => {
        html += `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div>
                    <h6 class="mb-1">${aff.clientNom || 'Client'}</h6>
                    <small class="text-muted">${aff.typeVetement || 'Modèle'}</small>
                </div>
                <div class="text-end">
                    <small class="text-muted d-block">Échéance: ${formatDate(aff.dateEcheance)}</small>
                    <span class="badge bg-${getAffectationStatusColor(aff.statut)}">${aff.statut || 'EN_COURS'}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p class="text-muted">Aucune affectation en cours</p>';
}

function displayProchainesEcheances(echeances) {
    const container = document.getElementById('prochainesEcheancesList');
    if (!container) return;
    
    let html = '';
    echeances.forEach(echeance => {
        const joursRestants = echeance.joursRestants || 0;
        const badgeColor = joursRestants <= 2 ? 'danger' : joursRestants <= 5 ? 'warning' : 'info';
        
        html += `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div>
                    <h6 class="mb-1">${echeance.clientNom || 'Client'}</h6>
                    <small class="text-muted">${echeance.typeVetement || 'Modèle'}</small>
                </div>
                <div class="text-end">
                    <small class="text-muted d-block">${formatDate(echeance.dateEcheance)}</small>
                    <span class="badge bg-${badgeColor}">${joursRestants} jour(s)</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p class="text-muted">Aucune échéance prochaine</p>';
}

function displayRdvAujourdhui(rendezVous) {
    const container = document.getElementById('rdvAujourdhuiList');
    if (!container) return;
    
    let html = '';
    rendezVous.forEach(rdv => {
        const date = new Date(rdv.dateHeure);
        html += `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div>
                    <h6 class="mb-1">${rdv.clientNom || 'Client'}</h6>
                    <small class="text-muted">
                        ${date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})} - ${rdv.type || 'RDV'}
                    </small>
                </div>
                <span class="badge bg-${getRdvStatusColor(rdv.statut)}">${rdv.statut || 'PLANIFIE'}</span>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p class="text-muted">Aucun rendez-vous aujourd\'hui</p>';
}

function displayClientsRecents(clients) {
    const container = document.getElementById('clientsRecentsList');
    if (!container) return;
    
    let html = '';
    clients.forEach(client => {
        const date = new Date(client.dateCreation);
        html += `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div>
                    <h6 class="mb-1">${client.nomComplet || 'Client'}</h6>
                    <small class="text-muted">${client.contact || 'Non renseigné'}</small>
                </div>
                <div class="text-end">
                    <small class="text-muted d-block">${date.toLocaleDateString('fr-FR')}</small>
                    <span class="badge bg-secondary">${client.totalCommandes || 0} cmd</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p class="text-muted">Aucun client récent</p>';
}

function displayTachesDuJour(taches) {
    const container = document.getElementById('tachesDuJourList');
    if (!container) return;
    
    let html = '';
    taches.forEach(tache => {
        const echeance = tache.echeance ? new Date(tache.echeance) : null;
        html += `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded ${tache.termine ? 'bg-light' : ''}">
                <div class="flex-grow-1">
                    <h6 class="mb-1 ${tache.termine ? 'text-muted text-decoration-line-through' : ''}">
                        ${tache.description || 'Tâche'}
                    </h6>
                    ${echeance ? `<small class="text-muted">Avant ${echeance.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</small>` : ''}
                </div>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" ${tache.termine ? 'checked' : ''}>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p class="text-muted">Aucune tâche pour aujourd\'hui</p>';
}

function displayPaiementsAttente(paiements) {
    const container = document.getElementById('paiementsAttenteList');
    if (!container) return;
    
    let html = '';
    paiements.forEach(paiement => {
        const date = new Date(paiement.dateEcheance);
        html += `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div>
                    <h6 class="mb-1">${paiement.clientNom || 'Client'}</h6>
                    <small class="text-muted">${paiement.typeVetement || 'Modèle'}</small>
                </div>
                <div class="text-end">
                    <div class="fw-bold text-warning">${formatCurrency(paiement.montant || 0)}</div>
                    <small class="text-muted">${date.toLocaleDateString('fr-FR')}</small>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p class="text-muted">Aucun paiement en attente</p>';
}

// === FONCTIONS UTILITAIRES ===
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF'
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return 'Non définie';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    } catch (e) {
        return 'Date invalide';
    }
}

function getRdvStatusColor(statut) {
    const colors = {
        'PLANIFIE': 'warning',
        'CONFIRME': 'success',
        'ANNULE': 'danger',
        'TERMINE': 'info'
    };
    return colors[statut] || 'secondary';
}

function getAffectationStatusColor(statut) {
    const colors = {
        'EN_ATTENTE': 'warning',
        'EN_COURS': 'primary',
        'TERMINE': 'success',
        'VALIDE': 'info',
        'ANNULE': 'danger'
    };
    return colors[statut] || 'secondary';
}

function getTachePriorityColor(priorite) {
    const colors = {
        'HAUTE': 'danger',
        'MOYENNE': 'warning',
        'BASSE': 'info'
    };
    return colors[priorite] || 'secondary';
}

// === GRAPHIQUES ===
function initializeAffectationsChart(repartition) {
    try {
        const ctx = document.getElementById('affectationsChart');
        if (!ctx) return;

        const labels = Object.keys(repartition || {});
        const data = Object.values(repartition || {});
        
        if (labels.length === 0) return;

        const colors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d'];
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Erreur graphique affectations:', error);
    }
}

function initializeSuperAdminCharts(data) {
    try {
        const caCtx = document.getElementById('chiffreAffairesChart');
        if (caCtx) {
            new Chart(caCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
                    datasets: [{
                        label: 'Chiffre d\'affaires',
                        data: [120000, 190000, 150000, 180000, 220000, 250000],
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Évolution du chiffre d\'affaires'
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('❌ Erreur graphiques SuperAdmin:', error);
    }
}

// === GESTION DE LA PÉRIODE ===
function setupDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const dateDebut = document.getElementById('dateDebut');
    const dateFin = document.getElementById('dateFin');
    
    if (dateDebut) dateDebut.value = firstDay.toISOString().split('T')[0];
    if (dateFin) dateFin.value = today.toISOString().split('T')[0];
}

function togglePeriode() {
    const section = document.getElementById('periodeSection');
    if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
    }
}

function appliquerPeriode() {
    const dateDebut = document.getElementById('dateDebut');
    const dateFin = document.getElementById('dateFin');
    
    if (!dateDebut || !dateFin || !dateDebut.value || !dateFin.value) {
        Common.showErrorMessage('Veuillez sélectionner une période complète');
        return;
    }
    
    currentPeriode = 'personnalisee';
    const periodeText = document.getElementById('periodeText');
    if (periodeText) periodeText.textContent = 'Période personnalisée';
    
    const periodeSection = document.getElementById('periodeSection');
    if (periodeSection) periodeSection.style.display = 'none';
    
    loadDashboardWithPeriode(dateDebut.value, dateFin.value);
}

async function loadDashboardWithPeriode(dateDebut, dateFin) {
    try {
        Common.showLoading('Chargement des données...');
        
        const userData = Common.getUserData();
        const atelierId = userData.atelierId || userData.atelier?.id;
        
        if (!atelierId) {
            throw new Error('Atelier non disponible');
        }
        
        // ✅ CORRECTION : Utiliser Common.apiCall
        const stats = await Common.apiCall(
            `/api/dashboard/statistiques/${atelierId}?dateDebut=${dateDebut}&dateFin=${dateFin}`
        );
        
        updateStatsWithPeriode(stats);
        Common.hideLoading();
        
    } catch (error) {
        console.error('Erreur chargement période:', error);
        Common.hideLoading();
        Common.showErrorMessage('Erreur lors du chargement des données de période');
    }
}

function updateStatsWithPeriode(stats) {
    console.log('📈 Statistiques période:', stats);
    // Implémentez la mise à jour des statistiques avec les données de période
}

// === RAFRAÎCHISSEMENT ===
function refreshDashboard() {
    loadDashboardData();
}

// Auto-rafraîchissement
setInterval(() => {
    if (document.visibilityState === 'visible') {
        refreshDashboard();
    }
}, 300000);

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        refreshDashboard();
    }
});

console.log('✅ Module dashboard chargé');