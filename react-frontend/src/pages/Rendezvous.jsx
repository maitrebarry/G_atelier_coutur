import React, { useState, useEffect } from 'react';
import api from '../api/api';
import Swal from 'sweetalert2';

const Rendezvous = () => {
    const [rendezvousList, setRendezvousList] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientDetails, setClientDetails] = useState(null);
    const [formData, setFormData] = useState({
        clientId: '',
        dateRendezVous: '',
        heureRendezVous: '10:00',
        motif: 'Essayage',
        notes: ''
    });

    // Initialisation des dates par défaut (demain)
    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, dateRendezVous: dateStr }));
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
            const atelierId = userData ? (userData.atelierId || (userData.atelier && userData.atelier.id)) : null;

            if (!atelierId) {
                Swal.fire('Erreur', 'Atelier non identifié', 'error');
                return;
            }

            // Charger les rendez-vous à venir
            const rvResponse = await api.get(`/rendezvous/atelier/${atelierId}/a-venir`);
            // Handle potential data wrapper
            const rvData = rvResponse.data.data || rvResponse.data;
            
            const rawList = Array.isArray(rvData) ? rvData : [];
            
            // Map API data to component state structure
            const mappedList = rawList.map(rdv => ({
                id: rdv.id,
                // Handle both separate fields and combined name
                clientNom: rdv.clientNom || (rdv.clientNomComplet ? rdv.clientNomComplet.split(' ').slice(1).join(' ') : ''),
                clientPrenom: rdv.clientPrenom || (rdv.clientNomComplet ? rdv.clientNomComplet.split(' ')[0] : 'Client'),
                clientTelephone: rdv.clientTelephone || rdv.clientContact || '',
                // Handle date
                dateRendezVous: rdv.dateRDV || rdv.dateRendezVous,
                heureRendezVous: rdv.heureRendezVous || (rdv.dateRDV ? new Date(rdv.dateRDV).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}) : ''),
                motif: rdv.typeRendezVous || rdv.motif,
                statut: rdv.statut
            }));

            setRendezvousList(mappedList);

            // Charger les clients pour le formulaire
            // Correction: Utiliser l'endpoint spécifique au module rendezvous comme dans le legacy
            const clientsResponse = await api.get(`/rendezvous/atelier/${atelierId}/clients`);
            // Handle potential data wrapper
            const clientsData = clientsResponse.data.data || clientsResponse.data;
            setClients(Array.isArray(clientsData) ? clientsData : []);

        } catch (error) {
            console.error("Erreur chargement données:", error);
            Swal.fire('Erreur', 'Impossible de charger les données', 'error');
        } finally {
            setLoading(false);
        }
    };

    const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

    const isValidEmail = (value) => {
        if (!value || typeof value !== 'string') return false;
        const v = value.trim();
        return EMAIL_REGEX.test(v);
    };

    const findEmailInObject = (obj) => {
        if (!obj || typeof obj !== 'object') return '';
        const queue = [obj];
        const visited = new Set();
        while (queue.length) {
            const cur = queue.shift();
            if (!cur || typeof cur !== 'object' || visited.has(cur)) continue;
            visited.add(cur);
            Object.values(cur).forEach((val) => {
                if (typeof val === 'string') {
                    const match = val.match(EMAIL_REGEX);
                    if (match && match[0]) {
                        throw new Error(`__EMAIL__${match[0]}`);
                    }
                } else if (val && typeof val === 'object') {
                    queue.push(val);
                }
            });
        }
        return '';
    };

    const getClientEmail = (client, details) => {
        const direct = (
            client?.email ||
            client?.emailClient ||
            client?.mail ||
            client?.email_client ||
            details?.email ||
            details?.client?.email ||
            details?.client?.mail ||
            details?.client?.email_client ||
            ''
        );
        if (isValidEmail(direct)) return direct;
        try {
            findEmailInObject(client);
        } catch (e) {
            if (String(e?.message || '').startsWith('__EMAIL__')) {
                return String(e.message).replace('__EMAIL__', '');
            }
        }
        try {
            findEmailInObject(details);
        } catch (e) {
            if (String(e?.message || '').startsWith('__EMAIL__')) {
                return String(e.message).replace('__EMAIL__', '');
            }
        }
        return '';
    };

    const handleClientSelect = async (client) => {
        let detailsData = null;
        try {
            const details = await api.get(`/rendezvous/clients/${client.id}/details`);
            detailsData = details.data;
            setClientDetails(details.data);
        } catch (error) {
            console.error("Erreur chargement détails client:", error);
            setClientDetails(null);
        }

        const emailValue = getClientEmail(client, detailsData);

        setSelectedClient({ ...client, email: emailValue || client?.email || '' });
        setFormData(prev => ({ ...prev, clientId: client.id }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving) {
            return;
        }
        setSaving(true);
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
            const atelierId = userData ? (userData.atelierId || (userData.atelier && userData.atelier.id)) : null;

            // Combine date and time for dateRDV
            const dateRDV = `${formData.dateRendezVous}T${formData.heureRendezVous}`;

            // Map motif to typeRendezVous
            let typeRendezVous = formData.motif.toUpperCase();
            if (typeRendezVous === 'ESSAYAGE') typeRendezVous = 'RETOUCHE';
            if (typeRendezVous === 'PRISE DE MESURES') typeRendezVous = 'MESURE';

            const payload = {
                clientId: formData.clientId,
                atelierId: atelierId,
                dateRDV: dateRDV,
                typeRendezVous: typeRendezVous,
                notes: formData.notes
            };

            await api.post('/rendezvous', payload);
            
            Swal.fire('Succès', 'Rendez-vous créé avec succès ! Un email de confirmation a été envoyé au client.', 'success');
            setShowModal(false);
            loadData(); // Recharger la liste
            
            // Reset form sauf la date qui reste pratique
            setFormData(prev => ({
                ...prev,
                clientId: '',
                motif: 'Essayage',
                notes: ''
            }));
            setSelectedClient(null);
            setClientDetails(null);

        } catch (error) {
            console.error("Erreur création rendez-vous:", error);
            const errorMessage = error.response?.data?.message || error.message || 'Impossible de créer le rendez-vous';
            Swal.fire('Erreur', errorMessage, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (id, action) => {
        try {
            const result = await Swal.fire({
                title: 'Êtes-vous sûr ?',
                text: `Voulez-vous vraiment ${action} ce rendez-vous ?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Oui',
                cancelButtonText: 'Non'
            });

            if (result.isConfirmed) {
                await api.put(`/rendezvous/${id}/${action}`);
                Swal.fire('Succès', `Rendez-vous ${action === 'confirmer' ? 'confirmé' : action === 'annuler' ? 'annulé' : 'terminé'}. Le client a été notifié par email.`, 'success');
                loadData();
            }
        } catch (error) {
            console.error(`Erreur ${action} rendez-vous:`, error);
            Swal.fire('Erreur', `Impossible de changer le statut`, 'error');
        }
    };

    const handleDeleteRendezVous = async (id) => {
        try {
            const result = await Swal.fire({
                title: 'Supprimer ce rendez-vous ?',
                text: 'Cette action est irréversible et aucune notification ne sera envoyée.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonText: 'Annuler',
                confirmButtonText: 'Supprimer'
            });

            if (result.isConfirmed) {
                await api.delete(`/rendezvous/${id}`);
                Swal.fire('Supprimé', 'Le rendez-vous a été supprimé.', 'success');
                loadData();
            }
        } catch (error) {
            console.error('Erreur suppression rendez-vous:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Impossible de supprimer ce rendez-vous';
            Swal.fire('Erreur', errorMessage, 'error');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'CONFIRME': return <span className="badge bg-success">Confirmé</span>;
            case 'EN_ATTENTE': return <span className="badge bg-warning text-dark">En attente</span>;
            case 'PLANIFIE': return <span className="badge bg-info text-dark">Planifié</span>;
            case 'ANNULE': return <span className="badge bg-danger">Annulé</span>;
            case 'TERMINE': return <span className="badge bg-secondary">Terminé</span>;
            default: return <span className="badge bg-secondary">{status}</span>;
        }
    };

    return (
        <>
            {/* Breadcrumb */}
            <div className="page-breadcrumb d-flex flex-wrap align-items-center gap-2 mb-3">
                <div className="breadcrumb-title pe-3">Rendez-vous</div>
                <div className="ps-3">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-0 p-0">
                            <li className="breadcrumb-item"><a href="/"><i className="bx bx-home-alt"></i></a></li>
                            <li className="breadcrumb-item active" aria-current="page">Gestion des Rendez-vous</li>
                        </ol>
                    </nav>
                </div>
                <div className="ms-auto">
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <i className="bx bx-plus"></i> Nouveau Rendez-vous
                    </button>
                </div>
            </div>

            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-body">
                            <div className="d-flex align-items-center mb-4">
                                <div>
                                    <h5 className="mb-0">Rendez-vous à venir</h5>
                                    <p className="mb-0 text-secondary">Gérez vos essayages et livraisons</p>
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Chargement...</span>
                                    </div>
                                </div>
                            ) : rendezvousList.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="bx bx-calendar-x fs-1 text-muted mb-3"></i>
                                    <p className="text-muted">Aucun rendez-vous prévu prochainement.</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Client</th>
                                                <th>Date & Heure</th>
                                                <th>Motif</th>
                                                <th>Statut</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rendezvousList.map((rv) => (
                                                <tr key={rv.id}>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div className="recent-product-img">
                                                                <img src="/assets/images/icons/user.png" alt="client" />
                                                            </div>
                                                            <div className="ms-2">
                                                                <h6 className="mb-1 font-14">{rv.clientNom} {rv.clientPrenom}</h6>
                                                                <small className="text-secondary">{rv.clientTelephone}</small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex flex-column">
                                                            <span className="fw-bold">{new Date(rv.dateRendezVous).toLocaleDateString('fr-FR')}</span>
                                                            <small className="text-secondary">{rv.heureRendezVous}</small>
                                                        </div>
                                                    </td>
                                                    <td>{rv.motif}</td>
                                                    <td>{getStatusBadge(rv.statut)}</td>
                                                    <td>
                                                        <div className="d-flex gap-2">
                                                            {(rv.statut === 'EN_ATTENTE' || rv.statut === 'PLANIFIE') && (
                                                                <>
                                                                    <button 
                                                                        className="btn btn-sm btn-success"
                                                                        onClick={() => handleStatusChange(rv.id, 'confirmer')}
                                                                        title="Confirmer"
                                                                    >
                                                                        <i className="bx bx-check"></i>
                                                                    </button>
                                                                    <button 
                                                                        className="btn btn-sm btn-danger"
                                                                        onClick={() => handleStatusChange(rv.id, 'annuler')}
                                                                        title="Annuler"
                                                                    >
                                                                        <i className="bx bx-x"></i>
                                                                    </button>
                                                                </>
                                                            )}
                                                            {rv.statut === 'CONFIRME' && (
                                                                <button 
                                                                    className="btn btn-sm btn-primary"
                                                                    onClick={() => handleStatusChange(rv.id, 'terminer')}
                                                                    title="Marquer comme terminé"
                                                                >
                                                                    <i className="bx bx-check-double"></i>
                                                                </button>
                                                            )}
                                                            {(rv.statut !== 'CONFIRME' && rv.statut !== 'TERMINE') && (
                                                                <button
                                                                    className="btn btn-sm btn-outline-danger"
                                                                    onClick={() => handleDeleteRendezVous(rv.id)}
                                                                    title="Supprimer"
                                                                >
                                                                    <i className="bx bx-trash"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Nouveau Rendez-vous */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Nouveau Rendez-vous</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="row">
                                        {/* Colonne Gauche : Sélection Client */}
                                        <div className="col-md-6 border-end">
                                            <h6 className="mb-3">1. Sélectionner un client</h6>
                                            <div className="mb-3">
                                                <input 
                                                    type="text" 
                                                    className="form-control mb-2" 
                                                    placeholder="Rechercher un client..." 
                                                    onChange={(e) => {
                                                        // Simple filter logic could be added here
                                                    }}
                                                />
                                                <div className="list-group" style={{maxHeight: '300px', overflowY: 'auto'}}>
                                                    {clients.map(client => (
                                                        <button
                                                            key={client.id}
                                                            type="button"
                                                            className={`list-group-item list-group-item-action ${selectedClient?.id === client.id ? 'active' : ''}`}
                                                            onClick={() => handleClientSelect(client)}
                                                        >
                                                            <div className="d-flex w-100 justify-content-between">
                                                                <h6 className="mb-1">
                                                                    {client.prenom} {client.nom}
                                                                    {isValidEmail(getClientEmail(client, clientDetails)) ? 
                                                                        <i className="bx bx-envelope text-success ms-2" title="Email valide"></i> : 
                                                                        <i className="bx bx-error-circle text-danger ms-2" title="Email manquant"></i>
                                                                    }
                                                                </h6>
                                                            </div>
                                                            <small>{client.contact}</small>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Colonne Droite : Détails RDV */}
                                        <div className="col-md-6">
                                            <h6 className="mb-3">2. Détails du rendez-vous</h6>
                                            
                                            {selectedClient ? (
                                                <>
                                                    <div className="alert alert-info py-2 mb-3">
                                                        <small><i className="bx bx-user me-1"></i>Client: <strong>{selectedClient.prenom} {selectedClient.nom}</strong></small>
                                                    </div>

                                                    <div className="mb-3">
                                                        <label className="form-label">Date</label>
                                                        <input 
                                                            type="date" 
                                                            className="form-control" 
                                                            name="dateRendezVous" 
                                                            value={formData.dateRendezVous} 
                                                            onChange={handleInputChange}
                                                            required 
                                                        />
                                                    </div>
                                                    <div className="mb-3">
                                                        <label className="form-label">Heure</label>
                                                        <input 
                                                            type="time" 
                                                            className="form-control" 
                                                            name="heureRendezVous" 
                                                            value={formData.heureRendezVous} 
                                                            onChange={handleInputChange}
                                                            required 
                                                        />
                                                    </div>
                                                    <div className="mb-3">
                                                        <label className="form-label">Motif</label>
                                                        <select 
                                                            className="form-select" 
                                                            name="motif" 
                                                            value={formData.motif} 
                                                            onChange={handleInputChange}
                                                        >
                                                            <option value="Essayage">Essayage</option>
                                                            <option value="Livraison">Livraison</option>
                                                            <option value="Prise de mesures">Prise de mesures</option>
                                                            <option value="Autre">Autre</option>
                                                        </select>
                                                    </div>
                                                    <div className="mb-3">
                                                        <label className="form-label">Notes (Optionnel)</label>
                                                        <textarea 
                                                            className="form-control"
                                                            name="notes"
                                                            rows="2"
                                                            value={formData.notes}
                                                            onChange={handleInputChange}
                                                        ></textarea>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center py-5 text-muted">
                                                    <i className="bx bx-left-arrow-alt mb-2"></i>
                                                    <p>Veuillez sélectionner un client à gauche</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary" disabled={!selectedClient || saving}>
                                        {saving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Enregistrement...
                                            </>
                                        ) : (
                                            'Enregistrer'
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

export default Rendezvous;
