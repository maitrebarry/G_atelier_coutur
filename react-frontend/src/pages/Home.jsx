import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { clearAuthData } from '../api/api';
import Swal from 'sweetalert2';
import Chart from 'chart.js/auto';

const Home = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    loadDashboardData();
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (dashboardData && dashboardData.affectationsParStatut && chartRef.current) {
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        
        const labels = Object.keys(dashboardData.affectationsParStatut);
        const values = Object.values(dashboardData.affectationsParStatut);
        
        if (labels.length > 0) {
            chartInstance.current = new Chart(chartRef.current, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
    }
  }, [dashboardData]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      await Swal.fire('Erreur', 'Erreur lors du chargement du dashboard. Vous serez redirigé vers la page de connexion.', 'error');
      try { clearAuthData(); } catch(e){}
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR');
    } catch (e) {
      return 'Date invalide';
    }
  };

  const getRdvStatusColor = (statut) => {
    const colors = {
      'PLANIFIE': 'warning',
      'CONFIRME': 'success',
      'ANNULE': 'danger',
      'TERMINE': 'info'
    };
    return colors[statut] || 'secondary';
  };

  const getAffectationStatusColor = (statut) => {
    const colors = {
      'EN_ATTENTE': 'warning',
      'EN_COURS': 'primary',
      'TERMINE': 'success',
      'VALIDE': 'info',
      'ANNULE': 'danger'
    };
    return colors[statut] || 'secondary';
  };

  const getTachePriorityColor = (priorite) => {
    const colors = {
      'HAUTE': 'danger',
      'MOYENNE': 'warning',
      'BASSE': 'info'
    };
    return colors[priorite] || 'secondary';
  };

  // --- Render Functions ---

  const renderStatsCards = () => {
    if (!dashboardData) return null;
    const data = dashboardData;

    if (data.totalAteliers !== undefined) {
      // Super Admin
      return (
        <>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{data.totalAteliers || 0}</h4>
                    <span className="text-muted">Ateliers</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-store-alt text-primary h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card success">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{data.totalUtilisateurs || 0}</h4>
                    <span className="text-muted">Utilisateurs</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-user-circle text-success h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card warning">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{data.totalClients || 0}</h4>
                    <span className="text-muted">Clients</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-group text-warning h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card info">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{formatCurrency(data.chiffreAffairesTotal || 0)}</h4>
                    <span className="text-muted">Chiffre d'affaires</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-money text-info h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    } else if (data.chiffreAffairesMensuel !== undefined) {
      // Propriétaire
      return (
        <>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{formatCurrency(data.chiffreAffairesMensuel || 0)}</h4>
                    <span className="text-muted">CA Mensuel</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-money text-primary h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card success">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{data.affectationsEnCours || 0}</h4>
                    <span className="text-muted">Commandes en cours</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-clipboard text-success h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card warning">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{data.totalClients || 0}</h4>
                    <span className="text-muted">Clients</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-group text-warning h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card info">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{data.totalTailleurs || 0}</h4>
                    <span className="text-muted">Tailleurs</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-user text-info h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    } else if (data.affectationsEnAttente !== undefined) {
      // Tailleur
      return (
        <>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{data.affectationsEnAttente || 0}</h4>
                    <span className="text-muted">En attente</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-time-five text-primary h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card success">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{data.affectationsEnCours || 0}</h4>
                    <span className="text-muted">En cours</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-cog text-success h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card warning">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{data.affectationsTermineesSemaine || 0}</h4>
                    <span className="text-muted">Terminées (7j)</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-check-circle text-warning h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card info">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{formatCurrency(data.revenusMensuels || 0)}</h4>
                    <span className="text-muted">Revenus mensuels</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-money text-info h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    } else if (data.nouveauxClientsSemaine !== undefined) {
      // Secrétaire
      return (
        <>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{data.rendezVousAujourdhui || 0}</h4>
                    <span className="text-muted">RDV Aujourd'hui</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-calendar text-primary h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card success">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{data.nouveauxClientsSemaine || 0}</h4>
                    <span className="text-muted">Nouveaux clients</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-user-plus text-success h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card warning">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{data.affectationsEnAttente || 0}</h4>
                    <span className="text-muted">Affectations en attente</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-clipboard text-warning h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card card-hover stat-card info">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4 className="mb-0">{data.paiementsAttente || 0}</h4>
                    <span className="text-muted">Paiements en attente</span>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="bx bx-credit-card text-info h1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }
    return null;
  };

  // --- Specific Dashboard Content ---

  const renderProprietaireContent = () => {
    const data = dashboardData;
    
    return (
      <div className="row">
        <div className="col-12 col-lg-8">
          {/* Performance Tailleurs */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Performance des tailleurs</h5>
            </div>
            <div className="card-body">
              {data.performanceTailleurs && data.performanceTailleurs.length > 0 ? (
                data.performanceTailleurs.map((perf, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-3 p-2 border rounded">
                    <div>
                      <h6 className="mb-1">{perf.nomTailleur || 'Tailleur'}</h6>
                      <small className="text-muted">
                        {perf.affectationsTerminees || 0} terminées • {perf.affectationsEnRetard || 0} retards
                      </small>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold text-primary">{Math.round(perf.satisfactionMoyenne || 0)}%</div>
                      <small className="text-muted">Satisfaction</small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted">Aucune donnée de performance</p>
              )}
            </div>
          </div>

          {/* Rendez-vous Prochains */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Prochains Rendez-vous</h5>
            </div>
            <div className="card-body">
              {data.rendezVousProchains && data.rendezVousProchains.length > 0 ? (
                data.rendezVousProchains.map((rdv, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                    <div>
                      <h6 className="mb-1">{rdv.clientNom || 'Client'}</h6>
                      <small className="text-muted">
                        {new Date(rdv.date).toLocaleDateString('fr-FR')} - {rdv.type || 'Rendez-vous'}
                      </small>
                    </div>
                    <span className={`badge bg-${getRdvStatusColor(rdv.statut)}`}>{rdv.statut || 'PLANIFIE'}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted">Aucun rendez-vous à venir</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          {/* Chart */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Statut des commandes</h5>
            </div>
            <div className="card-body">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          {/* Taches Urgentes */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Tâches Urgentes</h5>
            </div>
            <div className="card-body">
              {data.tachesUrgentes && data.tachesUrgentes.length > 0 ? (
                data.tachesUrgentes.map((tache, index) => (
                  <div key={index} className={`alert alert-${getTachePriorityColor(tache.priorite)} mb-2`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <span>{tache.description || 'Tâche urgente'}</span>
                      <small className="text-muted">{tache.type || 'URGENT'}</small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted">Aucune tâche urgente</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTailleurContent = () => {
    const data = dashboardData;
    return (
      <div className="row">
        <div className="col-12 col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Affectations en cours</h5>
            </div>
            <div className="card-body">
              {data.affectationsEnCoursList && data.affectationsEnCoursList.length > 0 ? (
                data.affectationsEnCoursList.map((aff, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                    <div>
                      <h6 className="mb-1">{aff.clientNom || 'Client'}</h6>
                      <small className="text-muted">{aff.typeVetement || 'Modèle'}</small>
                    </div>
                    <div className="text-end">
                      <small className="text-muted d-block">Échéance: {formatDate(aff.dateEcheance)}</small>
                      <span className={`badge bg-${getAffectationStatusColor(aff.statut)}`}>{aff.statut || 'EN_COURS'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted">Aucune affectation en cours</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Prochaines échéances</h5>
            </div>
            <div className="card-body">
              {data.prochainesEcheances && data.prochainesEcheances.length > 0 ? (
                data.prochainesEcheances.map((echeance, index) => {
                    const joursRestants = echeance.joursRestants || 0;
                    const badgeColor = joursRestants <= 2 ? 'danger' : joursRestants <= 5 ? 'warning' : 'info';
                    return (
                        <div key={index} className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                            <div>
                                <h6 className="mb-1">{echeance.clientNom || 'Client'}</h6>
                                <small className="text-muted">{echeance.typeVetement || 'Modèle'}</small>
                            </div>
                            <div className="text-end">
                                <small className="text-muted d-block">{formatDate(echeance.dateEcheance)}</small>
                                <span className={`badge bg-${badgeColor}`}>{joursRestants} jour(s)</span>
                            </div>
                        </div>
                    );
                })
              ) : (
                <p className="text-muted">Aucune échéance prochaine</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSecretaireContent = () => {
    const data = dashboardData;
    return (
      <div className="row">
        <div className="col-12 col-lg-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Rendez-vous Aujourd'hui</h5>
            </div>
            <div className="card-body">
              {data.rendezVousAujourdhuiList && data.rendezVousAujourdhuiList.length > 0 ? (
                data.rendezVousAujourdhuiList.map((rdv, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                    <div>
                      <h6 className="mb-1">{rdv.clientNom || 'Client'}</h6>
                      <small className="text-muted">
                        {new Date(rdv.dateHeure).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})} - {rdv.type || 'RDV'}
                      </small>
                    </div>
                    <span className={`badge bg-${getRdvStatusColor(rdv.statut)}`}>{rdv.statut || 'PLANIFIE'}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted">Aucun rendez-vous aujourd'hui</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Clients Récents</h5>
            </div>
            <div className="card-body">
              {data.clientsRecents && data.clientsRecents.length > 0 ? (
                data.clientsRecents.map((client, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                    <div>
                      <h6 className="mb-1">{client.nomComplet || 'Client'}</h6>
                      <small className="text-muted">{client.contact || 'Non renseigné'}</small>
                    </div>
                    <div className="text-end">
                      <small className="text-muted d-block">{new Date(client.dateCreation).toLocaleDateString('fr-FR')}</small>
                      <span className="badge bg-secondary">{client.totalCommandes || 0} cmd</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted">Aucun client récent</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="row">
          <div className="col-12 text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="mt-2 text-muted">Chargement du dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Accueil</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><a href="#"><i className="bx bx-home-alt"></i></a></li>
              <li className="breadcrumb-item active" aria-current="page">Tableau de bord</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="row" id="statsContainer">
        {renderStatsCards()}
      </div>

      {dashboardData && dashboardData.chiffreAffairesMensuel !== undefined && renderProprietaireContent()}
      {dashboardData && dashboardData.affectationsEnAttente !== undefined && renderTailleurContent()}
      {dashboardData && dashboardData.nouveauxClientsSemaine !== undefined && renderSecretaireContent()}
      {/* SuperAdmin content is mostly stats cards, but we can add more if needed */}
    </>
  );
};

export default Home;
