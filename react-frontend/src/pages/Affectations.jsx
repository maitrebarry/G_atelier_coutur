import React, { useState, useEffect, useCallback } from 'react';
import api, { getUserData } from '../api/api';
import Swal from 'sweetalert2';

const getDefaultRdvDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

const Affectations = () => {
  const [tailleurs, setTailleurs] = useState([]);
  const [clients, setClients] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [selectedClients, setSelectedClients] = useState(new Map());
  const [filters, setFilters] = useState({
    searchClient: '',
    typeVetement: '',
    statut: '',
    tailleurId: ''
  });
  const [formData, setFormData] = useState({
    tailleurId: '',
    dateEcheance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [showRendezvousModal, setShowRendezvousModal] = useState(false);
  const [rdvTarget, setRdvTarget] = useState(null);
  const [rdvSaving, setRdvSaving] = useState(false);
  const [rdvForm, setRdvForm] = useState({
    date: getDefaultRdvDate(),
    heure: '10:00',
    motif: 'Livraison',
    notes: ''
  });

  const userData = getUserData();
  const userRole = userData?.role;
  const userId = userData?.userId || userData?.id;
  const atelierId = userData?.atelierId;

  const canCreate = ['PROPRIETAIRE', 'SECRETAIRE'].includes(userRole);
  const canCancel = ['PROPRIETAIRE', 'SECRETAIRE', 'SUPERADMIN'].includes(userRole);

  const loadAffectations = useCallback(async () => {
    try {
      let url = `/affectations?atelierId=${atelierId}`;
      if (filters.statut) url += `&statut=${filters.statut}`;
      if (filters.tailleurId) url += `&tailleurId=${filters.tailleurId}`;
      const res = await api.get(url, {
        headers: {
            'X-User-Id': userId,
            'X-User-Role': userRole
        }
      });
      setAffectations(res.data.data || []);
    } catch (error) {
      console.error('Error loading affectations:', error);
    }
  }, [atelierId, filters.statut, filters.tailleurId, userId, userRole]);

  const loadData = useCallback(async () => {
    if (!atelierId) return;
    try {
      // Load tailleurs and clients only if can create
      if (canCreate) {
        const formDataRes = await api.get(`/affectations/formulaire-data?atelierId=${atelierId}`);
        if (formDataRes.data.success) {
          setTailleurs(formDataRes.data.data.tailleurs || []);
          setClients(formDataRes.data.data.clients || []);
        }
      }
      
      // Load affectations
      await loadAffectations();
    } catch (error) {
      console.error('Error loading data:', error);
      Swal.fire('Erreur', 'Impossible de charger les données', 'error');
    }
  }, [atelierId, canCreate, loadAffectations]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter clients for selection
  const getFilteredClients = () => {
    return clients.filter(client => {
      const matchesSearch = !filters.searchClient || 
        (client.nom && client.nom.toLowerCase().includes(filters.searchClient.toLowerCase())) ||
        (client.prenom && client.prenom.toLowerCase().includes(filters.searchClient.toLowerCase()));
      
      const matchesType = !filters.typeVetement || 
        (client.mesures && client.mesures.some(m => m.typeVetement === filters.typeVetement));
      
      // Must have measures
      const hasMeasures = client.mesures && client.mesures.length > 0;

      return matchesSearch && matchesType && hasMeasures;
    });
  };

  const handleClientToggle = (client) => {
    const newSelected = new Map(selectedClients);
    if (newSelected.has(client.id)) {
      newSelected.delete(client.id);
    } else {
      // Default to first measure
      const measure = client.mesures[0];
      newSelected.set(client.id, {
        clientId: client.id,
        mesureId: measure.id,
        prixTailleur: 5000,
        clientNom: `${client.prenom} ${client.nom}`,
        typeVetement: measure.typeVetement
      });
    }
    setSelectedClients(newSelected);
  };

  const handlePriceChange = (clientId, price) => {
    const newSelected = new Map(selectedClients);
    const item = newSelected.get(clientId);
    if (item) {
      item.prixTailleur = parseInt(price) || 0;
      newSelected.set(clientId, item);
      setSelectedClients(newSelected);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tailleurId) {
      Swal.fire('Erreur', 'Veuillez sélectionner un tailleur', 'error');
      return;
    }
    if (selectedClients.size === 0) {
      Swal.fire('Erreur', 'Veuillez sélectionner au moins un client', 'error');
      return;
    }

    try {
      const payload = {
        tailleurId: formData.tailleurId,
        dateEcheance: formData.dateEcheance || null,
        affectations: Array.from(selectedClients.values())
      };

      await api.post(`/affectations?atelierId=${atelierId}`, payload, {
        headers: { 'X-User-Id': userId }
      });

      Swal.fire('Succès', 'Affectation créée avec succès', 'success');
      setSelectedClients(new Map());
      setFormData(prev => ({ ...prev, tailleurId: '' }));
      loadData(); // Reload everything
    } catch (error) {
      console.error('Error creating affectation:', error);
      Swal.fire('Erreur', 'Erreur lors de la création', 'error');
    }
  };

  const openRendezvousModal = (affectation) => {
    setRdvTarget({
      clientId: affectation.client.id,
      clientNom: `${affectation.client.prenom} ${affectation.client.nom}`,
      clientContact: affectation.client.contact || '',
      mesureType: affectation.mesure?.typeVetement || ''
    });
    setRdvForm({
      date: getDefaultRdvDate(),
      heure: '10:00',
      motif: 'Livraison',
      notes: affectation.mesure?.typeVetement
        ? `Retrait ${affectation.mesure.typeVetement}`
        : ''
    });
    setShowRendezvousModal(true);
  };

  const closeRendezvousModal = () => {
    setShowRendezvousModal(false);
    setRdvTarget(null);
    setRdvForm({
      date: getDefaultRdvDate(),
      heure: '10:00',
      motif: 'Livraison',
      notes: ''
    });
  };

  const handleRdvInputChange = (e) => {
    const { name, value } = e.target;
    setRdvForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateRendezvous = async (e) => {
    e.preventDefault();
    if (!rdvTarget || rdvSaving) {
      return;
    }

    try {
      setRdvSaving(true);
      const dateRDV = `${rdvForm.date}T${rdvForm.heure}`;
      let typeRendezVous = rdvForm.motif.toUpperCase();
      if (typeRendezVous === 'ESSAYAGE') typeRendezVous = 'RETOUCHE';
      if (typeRendezVous === 'PRISE DE MESURES') typeRendezVous = 'MESURE';

      const payload = {
        clientId: rdvTarget.clientId,
        atelierId,
        dateRDV,
        typeRendezVous,
        notes: rdvForm.notes
      };

      await api.post('/rendezvous', payload);
      await loadAffectations();
      closeRendezvousModal();
      Swal.fire('Succès', 'Rendez-vous créé et email envoyé au client.', 'success')
        .then(() => {
          window.location.href = '/rendezvous';
        });
    } catch (error) {
      console.error('Erreur création rendez-vous depuis affectation:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Impossible de créer le rendez-vous';
      Swal.fire('Erreur', errorMessage, 'error');
    } finally {
      setRdvSaving(false);
    }
  };

  const handleStatusChange = async (affectation, newStatut) => {
    const result = await Swal.fire({
      title: 'Changer le statut ?',
      text: `Passer à "${newStatut}" ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui',
      cancelButtonText: 'Non'
    });

    if (result.isConfirmed) {
      try {
        await api.patch(`/affectations/${affectation.id}/statut`, { statut: newStatut }, {
            headers: {
                'X-User-Id': userId,
                'X-User-Role': userRole
            }
        });
        Swal.fire('Succès', 'Statut mis à jour', 'success');
        await loadAffectations();
        if (newStatut === 'VALIDE') {
          openRendezvousModal(affectation);
        }
      } catch (error) {
        console.error('Error updating status:', error);
        Swal.fire('Erreur', 'Impossible de mettre à jour le statut', 'error');
      }
    }
  };

  const handleCancel = async (affectationId) => {
    const result = await Swal.fire({
      title: 'Annuler ?',
      text: 'Cette action est irréversible',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Oui, annuler'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/affectations/${affectationId}`, {
            headers: {
                'X-User-Id': userId,
                'X-User-Role': userRole
            }
        });
        Swal.fire('Succès', 'Affectation annulée', 'success');
        loadData();
      } catch (error) {
        console.error('Error cancelling:', error);
        Swal.fire('Erreur', 'Impossible d\'annuler', 'error');
      }
    }
  };

  const getStatutBadge = (statut) => {
    const classes = {
      'EN_ATTENTE': 'bg-warning',
      'EN_COURS': 'bg-info',
      'TERMINE': 'bg-success',
      'VALIDE': 'bg-primary',
      'ANNULE': 'bg-danger'
    };
    return <span className={`badge ${classes[statut] || 'bg-secondary'}`}>{statut}</span>;
  };

  const getProgress = (statut) => {
    switch (statut) {
        case 'EN_ATTENTE': return 10;
        case 'EN_COURS': return 50;
        case 'TERMINE': return 90;
        case 'VALIDE': return 100;
        default: return 0;
    }
  };

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Affectations</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><a href="/home"><i className="bx bx-home-alt"></i></a></li>
              <li className="breadcrumb-item active" aria-current="page">Gestion des affectations</li>
            </ol>
          </nav>
        </div>
      </div>

      {canCreate && (
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="card-title mb-0"><i className="bx bx-plus-circle me-2"></i>Nouvelle Affectation</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Tailleur <span className="text-danger">*</span></label>
                  <select 
                    className="form-select" 
                    value={formData.tailleurId}
                    onChange={(e) => setFormData({...formData, tailleurId: e.target.value})}
                    required
                  >
                    <option value="">Choisir un tailleur...</option>
                    {tailleurs.map(t => (
                      <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Date d'échéance</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={formData.dateEcheance}
                    onChange={(e) => setFormData({...formData, dateEcheance: e.target.value})}
                  />
                </div>
              </div>

              <div className="card bg-light mb-3">
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Rechercher client..." 
                        value={filters.searchClient}
                        onChange={(e) => setFilters({...filters, searchClient: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6">
                      <select 
                        className="form-select"
                        value={filters.typeVetement}
                        onChange={(e) => setFilters({...filters, typeVetement: e.target.value})}
                      >
                        <option value="">Tous les types</option>
                        <option value="ROBE">Robe</option>
                        <option value="JUPE">Jupe</option>
                        <option value="HOMME">Homme</option>
                        <option value="ENFANT">Enfant</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row mb-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {getFilteredClients().length === 0 ? (
                    <div className="col-12 text-center text-muted">Aucun client disponible avec mesures</div>
                ) : (
                    getFilteredClients().map(client => (
                        <div key={client.id} className="col-md-6 col-lg-4 mb-3">
                            <div 
                                className={`card h-100 cursor-pointer ${selectedClients.has(client.id) ? 'border-primary bg-light' : ''}`}
                                onClick={() => handleClientToggle(client)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="card-body">
                                    <div className="d-flex align-items-center mb-2">
                                        <div className="form-check">
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox" 
                                                checked={selectedClients.has(client.id)}
                                                readOnly
                                            />
                                        </div>
                                        <div className="ms-2">
                                            <h6 className="mb-0">{client.prenom} {client.nom}</h6>
                                            <small className="text-muted">{client.mesures.length} mesure(s)</small>
                                        </div>
                                    </div>
                                    {selectedClients.has(client.id) && (
                                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                            <label className="small">Prix Tailleur (FCFA)</label>
                                            <input 
                                                type="number" 
                                                className="form-control form-control-sm" 
                                                value={selectedClients.get(client.id).prixTailleur}
                                                onChange={(e) => handlePriceChange(client.id, e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
              </div>

              <div className="text-end">
                <button type="submit" className="btn btn-primary" disabled={selectedClients.size === 0}>
                  Confirmer l'affectation ({selectedClients.size})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header bg-white">
            <div className="row g-3">
                <div className="col-md-4">
                    <select 
                        className="form-select"
                        value={filters.statut}
                        onChange={(e) => {
                            setFilters({...filters, statut: e.target.value});
                            // Trigger reload via effect or manual call? 
                            // Better to use effect on filters change or manual button
                        }}
                    >
                        <option value="">Tous les statuts</option>
                        <option value="EN_ATTENTE">En attente</option>
                        <option value="EN_COURS">En cours</option>
                        <option value="TERMINE">Terminé</option>
                        <option value="VALIDE">Validé</option>
                    </select>
                </div>
                <div className="col-md-4">
                    <button className="btn btn-outline-secondary" onClick={loadAffectations}>
                        <i className="bx bx-refresh me-1"></i>Actualiser
                    </button>
                </div>
            </div>
        </div>
        <div className="card-body">
            {affectations.length === 0 ? (
                <div className="text-center py-5 text-muted">Aucune affectation trouvée</div>
            ) : (
                affectations.map(aff => (
                    <div key={aff.id} className="card mb-3 border">
                        <div className="card-body">
                            <div className="row align-items-center">
                                <div className="col-md-4">
                                    <h6 className="mb-1">{aff.client.prenom} {aff.client.nom}</h6>
                                    <div className="small text-muted">Tailleur: {aff.tailleur.prenom} {aff.tailleur.nom}</div>
                                    <div className="small text-muted">Type: {aff.mesure.typeVetement}</div>
                                </div>
                                <div className="col-md-3 text-center">
                                    {getStatutBadge(aff.statut)}
                                    <div className="mt-2 small fw-bold">{aff.prixTailleur} FCFA</div>
                                </div>
                                <div className="col-md-3">
                                    <div className="progress" style={{height: '5px'}}>
                                        <div className={`progress-bar ${getStatutBadge(aff.statut).props.className.replace('badge ', '')}`} style={{width: `${getProgress(aff.statut)}%`}}></div>
                                    </div>
                                </div>
                                <div className="col-md-2 text-end">
                                    {/* Actions based on role and status */}
                                    {userRole === 'TAILLEUR' && aff.statut === 'EN_ATTENTE' && (
                                      <button className="btn btn-sm btn-success w-100 mb-1" onClick={() => handleStatusChange(aff, 'EN_COURS')}>Démarrer</button>
                                    )}
                                    {userRole === 'TAILLEUR' && aff.statut === 'EN_COURS' && (
                                      <button className="btn btn-sm btn-primary w-100 mb-1" onClick={() => handleStatusChange(aff, 'TERMINE')}>Terminer</button>
                                    )}
                                    {canCreate && aff.statut === 'TERMINE' && (
                                      <button className="btn btn-sm btn-success w-100 mb-1" onClick={() => handleStatusChange(aff, 'VALIDE')}>Valider</button>
                                    )}
                                    {canCancel && aff.statut !== 'VALIDE' && aff.statut !== 'ANNULE' && (
                                        <button className="btn btn-sm btn-outline-danger w-100" onClick={() => handleCancel(aff.id)}>Annuler</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

        {showRendezvousModal && rdvTarget && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Planifier le retrait du client</h5>
                  <button type="button" className="btn-close" onClick={closeRendezvousModal}></button>
                </div>
                <form onSubmit={handleCreateRendezvous}>
                  <div className="modal-body">
                    <p className="mb-3">
                      <strong>Client :</strong> {rdvTarget.clientNom}
                      {rdvTarget.clientContact && <><br /><span className="text-muted">{rdvTarget.clientContact}</span></>}
                    </p>
                    <div className="mb-3">
                      <label className="form-label">Date</label>
                      <input type="date" className="form-control" name="date" value={rdvForm.date} onChange={handleRdvInputChange} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Heure</label>
                      <input type="time" className="form-control" name="heure" value={rdvForm.heure} onChange={handleRdvInputChange} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Motif</label>
                      <select className="form-select" name="motif" value={rdvForm.motif} onChange={handleRdvInputChange}>
                        <option value="Livraison">Livraison</option>
                        <option value="Essayage">Essayage</option>
                        <option value="Prise de mesures">Prise de mesures</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Notes</label>
                      <textarea className="form-control" rows="3" name="notes" value={rdvForm.notes} onChange={handleRdvInputChange} placeholder="Informations supplémentaires"></textarea>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeRendezvousModal}>Fermer</button>
                    <button type="submit" className="btn btn-primary" disabled={rdvSaving}>
                      {rdvSaving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Enregistrement...
                        </>
                      ) : (
                        'Créer le rendez-vous'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
    </>
  );
};

export default Affectations;