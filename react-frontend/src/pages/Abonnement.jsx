import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
  fetchCurrentSubscription,
  fetchSubscriptionPayments,
  fetchSubscriptionPlans,
  submitManualSubscriptionPayment
} from '../api/subscription';
import {
  activateAdminAtelierSubscription,
  approveAdminSubscriptionPayment,
  createAdminSubscriptionPlan,
  deleteAdminSubscriptionPlan,
  fetchAdminAtelierSubscriptions,
  fetchAdminSubscriptionPayments,
  fetchAdminSubscriptionPlans,
  rejectAdminSubscriptionPayment,
  suspendAdminAtelierSubscription,
  updateAdminSubscriptionPlan
} from '../api/adminSubscription';

const Abonnement = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData') || '{}');
  const isSuperAdmin = (userData?.role || '').toUpperCase() === 'SUPERADMIN';

  const manualNumbers = {
    ORANGE_MONEY: '74745669',
    WAVE: '74745669',
    MOBICASH: '67205736'
  };

  const [current, setCurrent] = useState(null);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [adminPlans, setAdminPlans] = useState([]);
  const [adminAteliers, setAdminAteliers] = useState([]);
  const [adminPayments, setAdminPayments] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('PENDING');

  const [newPlan, setNewPlan] = useState({ code: '', libelle: '', dureeMois: 1, prix: 0, devise: 'XOF', actif: true });

  const [planCode, setPlanCode] = useState('MENSUEL');
  const [modePaiement, setModePaiement] = useState('ORANGE_MONEY');
  const [transactionRef, setTransactionRef] = useState('');
  const [ownerNote, setOwnerNote] = useState('');
  const [receipt, setReceipt] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const baseCalls = [
        fetchCurrentSubscription(),
        fetchSubscriptionPlans(),
        fetchSubscriptionPayments()
      ];

      const adminCalls = isSuperAdmin
        ? [fetchAdminSubscriptionPlans(), fetchAdminAtelierSubscriptions(), fetchAdminSubscriptionPayments(paymentFilter)]
        : [];

      const result = await Promise.all([...baseCalls, ...adminCalls]);
      const [currentData, plansData, paymentsData, adminPlansData, adminAteliersData, adminPaymentsData] = result;

      setCurrent(currentData || null);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      if (Array.isArray(plansData) && plansData.length > 0) {
        setPlanCode(plansData[0].code || 'MENSUEL');
      }

      if (isSuperAdmin) {
        setAdminPlans(Array.isArray(adminPlansData) ? adminPlansData : []);
        setAdminAteliers(Array.isArray(adminAteliersData) ? adminAteliersData : []);
        setAdminPayments(Array.isArray(adminPaymentsData) ? adminPaymentsData : []);
      }
    } catch (e) {
      Swal.fire('Erreur', e?.response?.data?.message || e?.message || 'Impossible de charger les données abonnement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [paymentFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!receipt) {
      Swal.fire('Pièce jointe requise', 'Veuillez ajouter une preuve de paiement.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await submitManualSubscriptionPayment({
        planCode,
        modePaiement,
        transactionRef,
        ownerNote,
        receipt
      });

      Swal.fire('Succès', 'Demande envoyée au SuperAdmin pour validation.', 'success');
      setTransactionRef('');
      setOwnerNote('');
      setReceipt(null);
      await loadData();
    } catch (e) {
      Swal.fire('Erreur', e?.response?.data?.message || e?.message || 'Échec de la soumission', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'ACTIVE': return <span className="badge bg-success">Actif</span>;
      case 'PAID': return <span className="badge bg-success">Payé</span>;
      case 'PENDING': return <span className="badge bg-warning text-dark">En attente</span>;
      case 'FAILED': return <span className="badge bg-danger">Rejeté</span>;
      case 'CANCELED': return <span className="badge bg-secondary">Suspendu</span>;
      default: return <span className="badge bg-light text-dark">{status || 'N/A'}</span>;
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await createAdminSubscriptionPlan(newPlan);
      setNewPlan({ code: '', libelle: '', dureeMois: 1, prix: 0, devise: 'XOF', actif: true });
      await loadData();
      Swal.fire('Succès', 'Plan créé', 'success');
    } catch (e2) {
      Swal.fire('Erreur', e2?.response?.data?.message || e2?.response?.data || e2?.message || 'Échec création plan', 'error');
    }
  };

  const handleTogglePlan = async (plan) => {
    try {
      await updateAdminSubscriptionPlan(plan.code, { actif: !plan.actif });
      await loadData();
    } catch (e) {
      Swal.fire('Erreur', e?.response?.data?.message || e?.message || 'Échec mise à jour plan', 'error');
    }
  };

  const handleDeletePlan = async (plan) => {
    const c = await Swal.fire({
      title: `Supprimer ${plan.code} ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui'
    });
    if (!c.isConfirmed) return;

    try {
      await deleteAdminSubscriptionPlan(plan.code);
      await loadData();
    } catch (e) {
      Swal.fire('Erreur', e?.response?.data?.message || e?.message || 'Échec suppression plan', 'error');
    }
  };

  const handleApprovePayment = async (paymentId) => {
    try {
      await approveAdminSubscriptionPayment(paymentId);
      await loadData();
      Swal.fire('Succès', 'Paiement approuvé', 'success');
    } catch (e) {
      Swal.fire('Erreur', e?.response?.data?.message || e?.message || 'Échec approbation', 'error');
    }
  };

  const handleRejectPayment = async (paymentId) => {
    const result = await Swal.fire({
      title: 'Motif du rejet',
      input: 'text',
      inputPlaceholder: 'Saisir un motif (optionnel)',
      showCancelButton: true,
      confirmButtonText: 'Rejeter'
    });
    if (!result.isConfirmed) return;

    try {
      await rejectAdminSubscriptionPayment(paymentId, result.value || '');
      await loadData();
      Swal.fire('Succès', 'Paiement rejeté', 'success');
    } catch (e) {
      Swal.fire('Erreur', e?.response?.data?.message || e?.message || 'Échec rejet', 'error');
    }
  };

  const handleActivateAtelier = async (atelierId) => {
    try {
      await activateAdminAtelierSubscription(atelierId, { planCode: 'MENSUEL' });
      await loadData();
    } catch (e) {
      Swal.fire('Erreur', e?.response?.data?.message || e?.message || 'Échec activation', 'error');
    }
  };

  const handleSuspendAtelier = async (atelierId) => {
    try {
      await suspendAdminAtelierSubscription(atelierId);
      await loadData();
    } catch (e) {
      Swal.fire('Erreur', e?.response?.data?.message || e?.message || 'Échec suspension', 'error');
    }
  };

  return (
    <div className="container-fluid">
      <div className="row mb-3">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="mb-3">Gestion de l'abonnement</h5>
              {loading ? (
                <p className="text-muted mb-0">Chargement...</p>
              ) : (
                <div className="row g-2">
                  <div className="col-md-3"><strong>Atelier:</strong> {current?.atelierNom || '-'}</div>
                  <div className="col-md-3"><strong>Plan:</strong> {current?.planLibelle || current?.planCode || '-'}</div>
                  <div className="col-md-2"><strong>Statut:</strong> {statusBadge(current?.status)}</div>
                  <div className="col-md-2"><strong>Échéance:</strong> {current?.dateFin ? new Date(current.dateFin).toLocaleDateString() : '-'}</div>
                  <div className="col-md-2"><strong>Jours restants:</strong> {current?.daysRemaining ?? '-'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="mb-3">Soumettre une preuve de paiement</h6>
              <div className="alert alert-info mb-3">
                <div className="fw-semibold mb-1">Numéros Mobile Money du service</div>
                <div>Orange Money: {manualNumbers.ORANGE_MONEY}</div>
                <div>Wave: {manualNumbers.WAVE}</div>
                <div>MobiCash: {manualNumbers.MOBICASH}</div>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="mb-2">
                  <label className="form-label">Plan</label>
                  <select className="form-select" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
                    {plans.map((p) => (
                      <option key={p.id || p.code} value={p.code}>
                        {p.libelle} ({p.prix} {p.devise})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-2">
                  <label className="form-label">Mode de paiement</label>
                  <select className="form-select" value={modePaiement} onChange={(e) => setModePaiement(e.target.value)}>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="WAVE">Wave</option>
                    <option value="MOBICASH">Mobicash</option>
                  </select>
                </div>

                <div className="mb-2">
                  <label className="form-label">Référence transaction (optionnel)</label>
                  <input className="form-control" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} />
                </div>

                <div className="mb-2">
                  <label className="form-label">Note (optionnel)</label>
                  <textarea className="form-control" rows="2" value={ownerNote} onChange={(e) => setOwnerNote(e.target.value)} />
                </div>

                <div className="mb-3">
                  <label className="form-label">Preuve de paiement</label>
                  <input className="form-control" type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                  {submitting ? 'Envoi...' : 'Envoyer pour validation'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="mb-3">Historique des paiements</h6>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Plan</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.reference}</td>
                        <td>{p.plan_code}</td>
                        <td>{p.montant} {p.devise}</td>
                        <td>{statusBadge(p.statut)}</td>
                        <td>{p.created_at ? new Date(p.created_at).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center text-muted py-4">Aucun paiement</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isSuperAdmin && (
        <>
          <div className="row g-3 mt-1">
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h6 className="mb-3">Plans d'abonnement</h6>
                  <form className="row g-2 mb-3" onSubmit={handleCreatePlan}>
                    <div className="col-4"><input className="form-control" placeholder="CODE" value={newPlan.code} onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value.toUpperCase() })} required /></div>
                    <div className="col-8"><input className="form-control" placeholder="Libellé" value={newPlan.libelle} onChange={(e) => setNewPlan({ ...newPlan, libelle: e.target.value })} required /></div>
                    <div className="col-4"><input type="number" min="1" className="form-control" value={newPlan.dureeMois} onChange={(e) => setNewPlan({ ...newPlan, dureeMois: Number(e.target.value) })} /></div>
                    <div className="col-4"><input type="number" min="0" className="form-control" value={newPlan.prix} onChange={(e) => setNewPlan({ ...newPlan, prix: Number(e.target.value) })} /></div>
                    <div className="col-4"><input className="form-control" value={newPlan.devise} onChange={(e) => setNewPlan({ ...newPlan, devise: e.target.value.toUpperCase() })} /></div>
                    <div className="col-12"><button type="submit" className="btn btn-outline-primary w-100">Créer un plan</button></div>
                  </form>

                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead><tr><th>Code</th><th>Durée</th><th>Prix</th><th>Actif</th><th></th></tr></thead>
                      <tbody>
                        {adminPlans.map((p) => (
                          <tr key={p.id || p.code}>
                            <td>{p.code}</td>
                            <td>{p.duree_mois} mois</td>
                            <td>{p.prix} {p.devise}</td>
                            <td>{p.actif ? <span className="badge bg-success">Oui</span> : <span className="badge bg-secondary">Non</span>}</td>
                            <td className="text-end">
                              <button className="btn btn-sm btn-outline-warning me-1" onClick={() => handleTogglePlan(p)}>Activer/Désactiver</button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeletePlan(p)}>Supprimer</button>
                            </td>
                          </tr>
                        ))}
                        {adminPlans.length === 0 && <tr><td colSpan="5" className="text-muted text-center">Aucun plan</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-7">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h6 className="mb-3">Abonnements ateliers</h6>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead><tr><th>Atelier</th><th>Plan</th><th>Statut</th><th>Échéance</th><th></th></tr></thead>
                      <tbody>
                        {adminAteliers.map((a) => (
                          <tr key={a.atelier_id || a.boutique_id}>
                            <td>{a.atelier_nom || '-'}</td>
                            <td>{a.plan_libelle || a.plan_code || '-'}</td>
                            <td>{statusBadge(a.statut || a.status)}</td>
                            <td>{a.date_fin ? new Date(a.date_fin).toLocaleDateString() : '-'}</td>
                            <td className="text-end">
                              <button className="btn btn-sm btn-outline-success me-1" onClick={() => handleActivateAtelier(a.atelier_id)}>Activer</button>
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => handleSuspendAtelier(a.atelier_id)}>Suspendre</button>
                            </td>
                          </tr>
                        ))}
                        {adminAteliers.length === 0 && <tr><td colSpan="5" className="text-muted text-center">Aucune donnée</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h6 className="mb-0">Paiements abonnement (admin)</h6>
                    <select className="form-select form-select-sm" style={{ maxWidth: 220 }} value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                      <option value="PENDING">En attente</option>
                      <option value="PAID">Payé</option>
                      <option value="FAILED">Rejeté</option>
                    </select>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead><tr><th>Réf</th><th>Atelier</th><th>Plan</th><th>Montant</th><th>Statut</th><th></th></tr></thead>
                      <tbody>
                        {adminPayments.map((p) => (
                          <tr key={p.id}>
                            <td>{p.reference}</td>
                            <td>{String(p.atelier_id || '').slice(0, 8)}</td>
                            <td>{p.plan_code}</td>
                            <td>{p.montant} {p.devise}</td>
                            <td>{statusBadge(p.statut)}</td>
                            <td className="text-end">
                              <button className="btn btn-sm btn-outline-success me-1" disabled={(p.statut || '').toUpperCase() !== 'PENDING'} onClick={() => handleApprovePayment(p.id)}>Approuver</button>
                              <button className="btn btn-sm btn-outline-danger" disabled={(p.statut || '').toUpperCase() !== 'PENDING'} onClick={() => handleRejectPayment(p.id)}>Rejeter</button>
                            </td>
                          </tr>
                        ))}
                        {adminPayments.length === 0 && <tr><td colSpan="6" className="text-muted text-center">Aucun paiement</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Abonnement;
