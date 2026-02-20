import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { clearAuthData } from '../api/api';
import Swal from 'sweetalert2';
import Chart from 'chart.js/auto';
import {
  activateAdminAtelierSubscription,
  approveAdminSubscriptionPayment,
  fetchAdminAtelierSubscriptions,
  fetchAdminSubscriptionPayments,
  fetchAdminSubscriptionPlans,
  rejectAdminSubscriptionPayment,
  suspendAdminAtelierSubscription,
  updateAdminAtelierSubscriptionDates
} from '../api/adminSubscription';

const Home = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const role = (JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData') || '{}')?.role || '').toUpperCase();

  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [atelierSubscriptions, setAtelierSubscriptions] = useState([]);
  const [subscriptionPayments, setSubscriptionPayments] = useState([]);
  const [planSelectionByAtelier, setPlanSelectionByAtelier] = useState({});
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState('');

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

  useEffect(() => {
    if (role === 'SUPERADMIN') {
      loadSubscriptions();
      // pass `true` to display confirmation modal with image when payments are fetched
      loadSubscriptionPayments(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const subscriptionStatusLabel = (s) => {
    const v = String(s || '').toUpperCase();
    if (v === 'ACTIVE') return 'Actif';
    if (v === 'CANCELED') return 'Suspendu';
    if (v === 'PAST_DUE') return 'En retard';
    if (v === 'EXPIRED') return 'Expiré';
    return s || 'N/A';
  };

  const paymentStatusLabel = (s) => {
    const v = String(s || '').toUpperCase();
    if (v === 'PENDING') return 'En attente';
    if (v === 'PAID') return 'Payé';
    if (v === 'FAILED') return 'Rejeté';
    return s || 'N/A';
  };

  const loadSubscriptions = async () => {
    try {
      setSubscriptionsLoading(true);
      setSubscriptionsError('');

      const [plansRes, ateliersRes] = await Promise.all([
        fetchAdminSubscriptionPlans(),
        fetchAdminAtelierSubscriptions()
      ]);

      const plans = Array.isArray(plansRes) ? plansRes : [];
      const ateliers = Array.isArray(ateliersRes) ? ateliersRes : [];

      setSubscriptionPlans(plans);
      setAtelierSubscriptions(ateliers);

      const map = {};
      ateliers.forEach((a) => {
        map[a.atelier_id] = a.plan_code || plans[0]?.code || 'MENSUEL';
      });
      setPlanSelectionByAtelier(map);
    } catch (e) {
      setSubscriptionsError(e?.response?.data?.message || e?.message || 'Erreur chargement abonnements');
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  // helper to build a full URL for uploaded files (images, preuves, etc.)
  const buildUploadUrl = (p) => {
    if (!p) return '';
    const normalized = String(p).replace(/\\/g, '/');
    if (normalized.startsWith('http')) return normalized;
    // remove trailing /api from base URL if present
    const base = api.defaults.baseURL.replace(/\/api$/i, '');
    return `${base}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
  };

  /**
   * When a superadmin loads payments we optionally present a modal
   * describing the first pending request so that the image is visible
   * and the user can approve/reject without drilling into the table.
   */
  const maybeShowSuperAdminPendingPaymentModal = async (rows) => {
    if (!rows || rows.length === 0) return;
    const first = rows[0] || {};
    const img = buildUploadUrl(first.preuve_url || first.preuveUrl);
    const r = await Swal.fire({
      icon: 'info',
      title: `${rows.length} demande(s) d'abonnement en attente`,
      html: `
        <div class="text-start">
          <div><strong>Atelier:</strong> ${first.atelier_nom || first.boutique_nom || '—'}</div>
          <div><strong>Canal:</strong> ${first.mode_paiement || first.provider || '—'}</div>
          <div><strong>Référence transfert:</strong> ${first.transaction_ref || '—'}</div>
          ${img ? `<div class="mt-2"><img src="${img}" alt="preuve" style="max-width:100%;max-height:260px;border:1px solid #ddd;border-radius:6px" /></div>` : '<div class="mt-2 text-muted">Aucune preuve image</div>'}
          <small class="d-block mt-2">Vérifiez votre numéro, puis validez ou rejetez.</small>
        </div>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Valider',
      denyButtonText: 'Rejeter',
      cancelButtonText: 'Plus tard'
    });

    if (r.isConfirmed) {
      await onApprovePayment(first.id);
    } else if (r.isDenied) {
      await onRejectPayment(first.id);
    }
  };

  const loadSubscriptionPayments = async (showConfirmModal = false) => {
    try {
      setPaymentsLoading(true);
      const rows = await fetchAdminSubscriptionPayments();
      setSubscriptionPayments(Array.isArray(rows) ? rows : []);
      if (showConfirmModal) {
        const pending = (rows || []).filter((r) => String((r.statut || r.status || '').toUpperCase()) === 'PENDING');
        await maybeShowSuperAdminPendingPaymentModal(pending);
      }
    } catch (e) {
      setSubscriptionsError(e?.response?.data?.message || e?.message || 'Erreur chargement paiements abonnement');
    } finally {
      setPaymentsLoading(false);
    }
  };

  const onActivateSubscription = async (atelierId) => {
    try {
      const planCode = planSelectionByAtelier[atelierId] || subscriptionPlans[0]?.code || 'MENSUEL';
      await activateAdminAtelierSubscription(atelierId, { planCode });
      await loadSubscriptions();
      Swal.fire('Succès', 'Abonnement activé', 'success');
    } catch (e) {
      setSubscriptionsError(e?.response?.data?.message || e?.message || 'Erreur activation abonnement');
    }
  };

  const onSuspendSubscription = async (atelierId) => {
    try {
      await suspendAdminAtelierSubscription(atelierId);
      await loadSubscriptions();
      Swal.fire('Succès', 'Abonnement suspendu', 'success');
    } catch (e) {
      setSubscriptionsError(e?.response?.data?.message || e?.message || 'Erreur suspension abonnement');
    }
  };

  const onEditSubscriptionDates = async (row) => {
    const toDateTimeLocalValue = (raw) => {
      if (!raw) return '';
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const startDefault = toDateTimeLocalValue(row.date_debut);
    const endDefault = toDateTimeLocalValue(row.date_fin);

    const result = await Swal.fire({
      title: `Modifier les dates - ${row.atelier_nom || 'Atelier'}`,
      html:
        '<label class="form-label d-block text-start">Date début</label>' +
        `<input id="swal-date-debut" type="datetime-local" class="swal2-input" value="${startDefault}">` +
        '<label class="form-label d-block text-start">Date fin</label>' +
        `<input id="swal-date-fin" type="datetime-local" class="swal2-input" value="${endDefault}">`,
      showCancelButton: true,
      confirmButtonText: 'Enregistrer',
      preConfirm: () => {
        const dateDebut = document.getElementById('swal-date-debut')?.value;
        const dateFin = document.getElementById('swal-date-fin')?.value;
        if (!dateDebut || !dateFin) {
          Swal.showValidationMessage('Les deux dates sont requises');
          return false;
        }
        if (new Date(dateFin).getTime() <= new Date(dateDebut).getTime()) {
          Swal.showValidationMessage('La date de fin doit être après la date de début');
          return false;
        }
        return { dateDebut, dateFin };
      }
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      await updateAdminAtelierSubscriptionDates(row.atelier_id, result.value);
      await loadSubscriptions();
      Swal.fire('Succès', 'Dates mises à jour', 'success');
    } catch (e) {
      setSubscriptionsError(e?.response?.data?.message || e?.message || 'Erreur mise à jour des dates');
    }
  };

  const onApprovePayment = async (paymentId) => {
    try {
      await approveAdminSubscriptionPayment(paymentId);
      await Promise.all([loadSubscriptions(), loadSubscriptionPayments()]);
      Swal.fire('Succès', 'Paiement validé', 'success');
    } catch (e) {
      setSubscriptionsError(e?.response?.data?.message || e?.message || 'Erreur validation paiement');
    }
  };

  const onRejectPayment = async (paymentId) => {
    const result = await Swal.fire({
      title: 'Motif du rejet',
      input: 'text',
      inputPlaceholder: 'Saisir le motif (optionnel)',
      showCancelButton: true,
      confirmButtonText: 'Rejeter'
    });
    if (!result.isConfirmed) return;

    try {
      await rejectAdminSubscriptionPayment(paymentId, result.value || '');
      await loadSubscriptionPayments();
      Swal.fire('Succès', 'Paiement rejeté', 'success');
    } catch (e) {
      setSubscriptionsError(e?.response?.data?.message || e?.message || 'Erreur rejet paiement');
    }
  };

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

  const renderSuperAdminContent = () => {
    return (
      <>
        <div className="row g-4 mt-1">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between">
                <h6 className="mb-0">Gestion des abonnements</h6>
                <button className="btn btn-sm btn-outline-primary" onClick={loadSubscriptions}>
                  <i className="bx bx-refresh me-1"></i>Rafraîchir
                </button>
              </div>
              <div className="card-body">
                {subscriptionsError && (
                  <div className="alert alert-warning py-2">{subscriptionsError}</div>
                )}

                {subscriptionsLoading ? (
                  <div className="text-muted">Chargement abonnements...</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Atelier</th>
                          <th>Plan</th>
                          <th>Statut</th>
                          <th>Début</th>
                          <th>Fin</th>
                          <th style={{ width: 280 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atelierSubscriptions.map((row) => (
                          <tr key={`sub-${row.atelier_id}`}>
                            <td>{row.atelier_nom}</td>
                            <td>{row.plan_libelle || '—'}</td>
                            <td>
                              <span className={`badge ${row.statut === 'ACTIVE' ? 'bg-success' : row.statut === 'CANCELED' ? 'bg-secondary' : 'bg-warning text-dark'}`}>
                                {subscriptionStatusLabel(row.statut)}
                              </span>
                            </td>
                            <td>{row.date_debut ? new Date(row.date_debut).toLocaleDateString('fr-FR') : '—'}</td>
                            <td>{row.date_fin ? new Date(row.date_fin).toLocaleDateString('fr-FR') : '—'}</td>
                            <td>
                              <div className="d-flex align-items-center gap-2 flex-nowrap">
                                <select
                                  className="form-select form-select-sm"
                                  style={{ minWidth: 170 }}
                                  value={planSelectionByAtelier[row.atelier_id] || row.plan_code || subscriptionPlans[0]?.code || 'MENSUEL'}
                                  onChange={(e) => setPlanSelectionByAtelier((prev) => ({ ...prev, [row.atelier_id]: e.target.value }))}
                                >
                                  {subscriptionPlans.map((p) => (
                                    <option key={p.code} value={p.code}>{p.libelle} ({p.duree_mois}m)</option>
                                  ))}
                                </select>
                                <button className="btn btn-sm btn-success" onClick={() => onActivateSubscription(row.atelier_id)} title="Activer le plan">
                                  <i className="bx bx-check-circle"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => onSuspendSubscription(row.atelier_id)} title="Suspendre l'abonnement">
                                  <i className="bx bx-pause-circle"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-primary" onClick={() => onEditSubscriptionDates(row)} title="Modifier les dates">
                                  <i className="bx bx-edit"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {atelierSubscriptions.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-muted text-center py-3">Aucune donnée abonnement</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4 mt-1">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between">
                <h6 className="mb-0">Paiements abonnement (manuel)</h6>
                <button className="btn btn-sm btn-outline-primary" onClick={loadSubscriptionPayments}>
                  <i className="bx bx-refresh me-1"></i>Rafraîchir
                </button>
              </div>
              <div className="card-body">
                {paymentsLoading ? (
                  <div className="text-muted">Chargement paiements...</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>N°</th>
                          <th>Atelier</th>
                          <th>Référence</th>
                          <th>Réf. transfert</th>
                          <th>Plan</th>
                          <th>Montant</th>
                          <th>Statut</th>
                          <th>Provider</th>
                          <th>Mode</th>
                          <th>Preuve</th>
                          <th>Créé le</th>
                          <th style={{ width: 180 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptionPayments.map((p, index) => (
                          <tr key={`pay-${p.id}`}>
                            <td>{index + 1}</td>
                            <td>{atelierSubscriptions.find((a) => String(a.atelier_id) === String(p.atelier_id))?.atelier_nom || '—'}</td>
                            <td>{p.reference}</td>
                            <td>{p.transaction_ref || '—'}</td>
                            <td>{p.plan_code || '—'}</td>
                            <td>{p.montant} {p.devise}</td>
                            <td>
                              <span className={`badge ${String(p.statut).toUpperCase() === 'PENDING' ? 'bg-warning text-dark' : String(p.statut).toUpperCase() === 'PAID' ? 'bg-success' : 'bg-secondary'}`}>
                                {paymentStatusLabel(p.statut)}
                              </span>
                            </td>
                            <td>{p.provider}</td>
                            <td>{p.mode_paiement || '—'}</td>
                            <td>
                              {p.preuve_url ? (
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => Swal.fire({
                                    title: `Preuve ${p.reference || ''}`.trim(),
                                    imageUrl: buildUploadUrl(p.preuve_url),
                                    imageAlt: 'Preuve de paiement',
                                    showCloseButton: true,
                                    confirmButtonText: 'Fermer',
                                  })}
                                >
                                  <i className="bx bx-image"></i>
                                </button>
                              ) : '—'}
                            </td>
                            <td>{p.created_at ? new Date(p.created_at).toLocaleString('fr-FR') : '—'}</td>
                            <td>
                              <div className="d-flex gap-2">
                                <button className="btn btn-sm btn-success" disabled={String(p.statut).toUpperCase() !== 'PENDING'} onClick={() => onApprovePayment(p.id)} title="Valider paiement">
                                  <i className="bx bx-check-circle"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-danger" disabled={String(p.statut).toUpperCase() !== 'PENDING'} onClick={() => onRejectPayment(p.id)} title="Rejeter paiement">
                                  <i className="bx bx-x-circle"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {subscriptionPayments.length === 0 && (
                          <tr>
                            <td colSpan={12} className="text-muted text-center py-3">Aucun paiement</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
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
      {dashboardData && dashboardData.totalAteliers !== undefined && renderSuperAdminContent()}
    </>
  );
};

export default Home;
