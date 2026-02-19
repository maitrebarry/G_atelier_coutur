import React, { useEffect, useState } from 'react';
import api from '../api/api';
import Swal from 'sweetalert2';
import Signup from './Signup';
import Permissions from './Permissions';
import ListePermissions from './ListePermissions';

const menuItems = [
    { key: 'ateliers', label: 'Ateliers', icon: 'bx bx-home-alt' },
    { key: 'abonnement-tarifs', label: 'Tarifs abonnement', icon: 'bx bx-money' },
    { key: 'utilisateurs', label: 'Utilisateurs', icon: 'bx bx-user' },
    { key: 'assigner', label: 'Assigner Permission', icon: 'bx bx-user-pin' },
    { key: 'liste', label: 'Liste Permission', icon: 'bx bx-list-ul' }
];

const Parametres = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedMenu, setSelectedMenu] = useState('ateliers');
    const [ateliers, setAteliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [subscriptionPlans, setSubscriptionPlans] = useState([]);
    const [selectedPlanCode, setSelectedPlanCode] = useState('MENSUEL');
    const [initialPlanCodeForEdit, setInitialPlanCodeForEdit] = useState(null);
    const [initialSubscriptionIdForEdit, setInitialSubscriptionIdForEdit] = useState(null);
    const [planCrudLoading, setPlanCrudLoading] = useState(false);
    const [planSavingCode, setPlanSavingCode] = useState(null);
    const [planMessage, setPlanMessage] = useState('');
    const [planError, setPlanError] = useState('');
    const [planEdits, setPlanEdits] = useState({});
    const [newPlan, setNewPlan] = useState({
        code: '',
        libelle: '',
        dureeMois: '1',
        prix: '',
        devise: 'XOF',
        actif: true
    });
    const [formData, setFormData] = useState({
        id: '',
        nom: '',
        adresse: '',
        email: '',
        telephone: '',
        dateCreation: ''
    });

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
        setCurrentUser(userData);

        if (userData && (userData.role === 'SUPERADMIN' || userData.role === 'PROPRIETAIRE')) {
            loadAteliers();
            if (userData.role === 'SUPERADMIN') {
                loadSubscriptionPlans();
            }
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadAteliers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/ateliers');
            setAteliers(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Erreur chargement ateliers:', error);
            Swal.fire('Erreur', "Impossible de charger les ateliers", 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadSubscriptionPlans = async () => {
        setPlanCrudLoading(true);
        try {
            const response = await api.get('/admin/subscriptions/plans');
            const plans = Array.isArray(response.data) ? response.data : [];
            setSubscriptionPlans(plans);

            const nextEdits = {};
            plans.forEach((p) => {
                const code = String(p?.code || '');
                if (!code) return;
                nextEdits[code] = {
                    libelle: p?.libelle != null ? String(p.libelle) : '',
                    dureeMois: p?.duree_mois != null ? String(p.duree_mois) : '',
                    prix: p?.prix != null ? String(p.prix) : '',
                    devise: p?.devise != null ? String(p.devise) : 'XOF',
                    actif: Boolean(p?.actif ?? true)
                };
            });
            setPlanEdits(nextEdits);

            if (plans.length > 0) {
                setSelectedPlanCode(plans[0].code || 'MENSUEL');
            }
        } catch (error) {
            console.error('Erreur chargement plans abonnement:', error);
            setPlanError(error?.response?.data?.message || error?.message || 'Erreur chargement des tarifs abonnement');
            setSubscriptionPlans([]);
            setPlanEdits({});
        } finally {
            setPlanCrudLoading(false);
        }
    };

    const onSaveSubscriptionPlan = async (code) => {
        const current = planEdits[code];
        if (!current) return;

        const prixNum = Number(current.prix);
        const dureeNum = Number(current.dureeMois);

        if (!current.libelle.trim()) {
            setPlanError('Le libellé est obligatoire');
            return;
        }
        if (!Number.isFinite(dureeNum) || dureeNum <= 0) {
            setPlanError('La durée (mois) doit être un nombre positif');
            return;
        }
        if (!Number.isFinite(prixNum) || prixNum <= 0) {
            setPlanError('Le prix doit être un nombre positif');
            return;
        }

        setPlanSavingCode(code);
        setPlanError('');
        setPlanMessage('');

        try {
            await api.put(`/admin/subscriptions/plans/${encodeURIComponent(code)}`, {
                libelle: current.libelle.trim(),
                dureeMois: dureeNum,
                prix: prixNum,
                devise: (current.devise || 'XOF').trim().toUpperCase(),
                actif: current.actif
            });
            setPlanMessage(`Tarif ${code} mis à jour avec succès.`);
            await loadSubscriptionPlans();
        } catch (error) {
            setPlanError(error?.response?.data?.message || error?.message || `Erreur mise à jour du tarif ${code}`);
        } finally {
            setPlanSavingCode(null);
        }
    };

    const onCreateSubscriptionPlan = async () => {
        const code = newPlan.code.trim().toUpperCase();
        const libelle = newPlan.libelle.trim();
        const dureeNum = Number(newPlan.dureeMois);
        const prixNum = Number(newPlan.prix);

        if (!code) return setPlanError('Le code est obligatoire');
        if (!libelle) return setPlanError('Le libellé est obligatoire');
        if (!Number.isFinite(dureeNum) || dureeNum <= 0) return setPlanError('Durée invalide');
        if (!Number.isFinite(prixNum) || prixNum <= 0) return setPlanError('Prix invalide');

        setPlanError('');
        setPlanMessage('');

        try {
            await api.post('/admin/subscriptions/plans', {
                code,
                libelle,
                dureeMois: dureeNum,
                prix: prixNum,
                devise: (newPlan.devise || 'XOF').trim().toUpperCase(),
                actif: newPlan.actif
            });
            setPlanMessage(`Plan ${code} créé avec succès.`);
            setNewPlan({
                code: '',
                libelle: '',
                dureeMois: '1',
                prix: '',
                devise: 'XOF',
                actif: true
            });
            await loadSubscriptionPlans();
        } catch (error) {
            setPlanError(error?.response?.data?.message || error?.message || 'Erreur création du plan');
        }
    };

    const onDeleteSubscriptionPlan = async (code) => {
        const confirm = await Swal.fire({
            icon: 'warning',
            title: `Supprimer le plan ${code} ?`,
            text: 'Si ce plan a déjà été utilisé, il sera désactivé automatiquement.',
            showCancelButton: true,
            confirmButtonText: 'Oui, continuer',
            cancelButtonText: 'Annuler'
        });
        if (!confirm.isConfirmed) return;

        setPlanError('');
        setPlanMessage('');

        try {
            const res = await api.delete(`/admin/subscriptions/plans/${encodeURIComponent(code)}`);
            const out = res?.data || {};
            setPlanMessage(out?.disabled ? `Plan ${code} désactivé (historique conservé).` : `Plan ${code} supprimé.`);
            await loadSubscriptionPlans();
        } catch (error) {
            setPlanError(error?.response?.data?.message || error?.message || `Erreur suppression du plan ${code}`);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const openModal = async (atelier = null) => {
        if (atelier) {
            setIsEditing(true);
            setFormData({
                id: atelier.id,
                nom: atelier.nom,
                adresse: atelier.adresse,
                email: atelier.email,
                telephone: atelier.telephone,
                dateCreation: atelier.dateCreation ? new Date(atelier.dateCreation).toISOString().slice(0, 16) : ''
            });

            if (currentUser?.role === 'SUPERADMIN') {
                try {
                    const subRes = await api.get(`/admin/subscriptions/ateliers/${atelier.id}`);
                    const currentPlanCode = subRes?.data?.plan_code || null;
                    const currentSubscriptionId = subRes?.data?.abonnement_id || null;
                    setSelectedPlanCode(currentPlanCode || subscriptionPlans[0]?.code || 'MENSUEL');
                    setInitialPlanCodeForEdit(currentPlanCode);
                    setInitialSubscriptionIdForEdit(currentSubscriptionId);
                } catch (e) {
                    setSelectedPlanCode('MENSUEL');
                    setInitialPlanCodeForEdit(null);
                    setInitialSubscriptionIdForEdit(null);
                }
            }
        } else {
            setIsEditing(false);
            setFormData({
                id: '',
                nom: '',
                adresse: '',
                email: '',
                telephone: '',
                dateCreation: ''
            });
            setSelectedPlanCode(subscriptionPlans[0]?.code || 'MENSUEL');
            setInitialPlanCodeForEdit(null);
            setInitialSubscriptionIdForEdit(null);
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        try {
            if (isEditing) {
                if (currentUser.role === 'PROPRIETAIRE' && currentUser.atelierId !== formData.id) {
                    Swal.fire('Erreur', "Vous n'avez pas la permission de modifier cet atelier", 'error');
                    return;
                }

                const payload = { ...formData };
                if (currentUser.role !== 'SUPERADMIN') {
                    delete payload.dateCreation;
                }

                await api.put(`/ateliers/${formData.id}`, payload);

                if (currentUser.role === 'SUPERADMIN' && selectedPlanCode) {
                    const shouldActivate = !initialSubscriptionIdForEdit || selectedPlanCode !== initialPlanCodeForEdit;
                    if (shouldActivate) {
                        try {
                            await api.post(`/admin/subscriptions/ateliers/${formData.id}/activate`, {
                                planCode: selectedPlanCode
                            });
                        } catch (subError) {
                            const detail = subError?.response?.data?.message || subError?.response?.data || subError?.message || '';
                            await Swal.fire(
                                'Attention',
                                `Atelier modifié, mais le plan d'abonnement n'a pas pu être mis à jour.${detail ? `\n\nDétail: ${detail}` : ''}`,
                                'warning'
                            );
                        }
                    }
                }
                Swal.fire('Succès', 'Atelier modifié avec succès', 'success');
            } else {
                const created = await api.post('/ateliers', formData);
                const atelierId = created?.data?.id;

                if (currentUser.role === 'SUPERADMIN' && atelierId) {
                    await api.post(`/admin/subscriptions/ateliers/${atelierId}/activate`, {
                        planCode: selectedPlanCode
                    });
                }

                Swal.fire('Succès', 'Atelier ajouté avec succès', 'success');
            }
            setShowModal(false);
            setInitialSubscriptionIdForEdit(null);
            loadAteliers();
        } catch (error) {
            console.error('Erreur sauvegarde atelier:', error);
            Swal.fire('Erreur', "Impossible de sauvegarder l'atelier", 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!currentUser || currentUser.role !== 'SUPERADMIN') {
            Swal.fire('Erreur', 'Seul un SuperAdmin peut supprimer un atelier', 'error');
            return;
        }

        const result = await Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: "Vous ne pourrez pas annuler cette action !",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/ateliers/${id}`);
                Swal.fire('Supprimé !', "L'atelier a été supprimé.", 'success');
                loadAteliers();
            } catch (error) {
                console.error('Erreur suppression atelier:', error);
                Swal.fire('Erreur', "Impossible de supprimer l'atelier", 'error');
            }
        }
    };

    if (!currentUser || (currentUser.role !== 'SUPERADMIN' && currentUser.role !== 'PROPRIETAIRE')) {
        return (
            <div className="alert alert-danger m-4">
                Accès refusé. Vous n'avez pas la permission de voir cette page.
            </div>
        );
    }

    return (
        <>
            <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
                <div className="breadcrumb-title pe-3">Paramètres</div>
                <div className="ps-3">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-0 p-0">
                            <li className="breadcrumb-item"><a href="/"><i className="bx bx-home-alt"></i></a></li>
                            <li className="breadcrumb-item active" aria-current="page">Gestion des Ateliers</li>
                        </ol>
                    </nav>
                </div>
            </div>

            <div className="row g-3">
                <div className="col-12 col-lg-3">
                    <div className="card h-100">
                        <div className="card-header bg-primary">
                            <h6 className="mb-0 text-center text-white">Menu Paramètres</h6>
                        </div>
                        <div className="card-body p-0 param-menu">
                            <div className="list-group list-group-flush">
                                {menuItems
                                    .filter((item) => !(item.key === 'abonnement-tarifs' && currentUser.role !== 'SUPERADMIN'))
                                    .map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        className={`list-group-item list-group-item-action border-0 d-flex align-items-center gap-2 py-3 ${selectedMenu === item.key ? 'active' : ''}`}
                                        onClick={() => setSelectedMenu(item.key)}
                                    >
                                        <i className={`${item.icon} fs-5`}></i>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-9">
                    {selectedMenu === 'ateliers' && (
                        <div className="card">
                            <div className="card-header bg-primary d-flex justify-content-between align-items-center">
                                <h6 className="mb-0 text-white">Liste des Ateliers</h6>
                                {currentUser.role === 'SUPERADMIN' && (
                                    <button className="btn btn-light btn-sm" onClick={() => openModal()}>
                                        <i className="bx bx-plus me-1"></i>Ajouter un atelier
                                    </button>
                                )}
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table table-bordered table-hover">
                                        <thead className="table-light">
                                            <tr>
                                                <th>N°</th>
                                                <th>Nom</th>
                                                <th>Adresse</th>
                                                <th>Email</th>
                                                <th>Téléphone</th>
                                                <th>Date de création</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="7" className="text-center">
                                                        <div className="spinner-border spinner-border-sm me-2" role="status">
                                                            <span className="visually-hidden">Chargement...</span>
                                                        </div>
                                                        Chargement des ateliers...
                                                    </td>
                                                </tr>
                                            ) : ateliers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="text-center">Aucun atelier enregistré</td>
                                                </tr>
                                            ) : (
                                                ateliers.map((atelier, index) => {
                                                    const canEdit = currentUser.role === 'SUPERADMIN'
                                                        || (currentUser.role === 'PROPRIETAIRE' && currentUser.atelierId === atelier.id);
                                                    const canDelete = currentUser.role === 'SUPERADMIN';

                                                    return (
                                                        <tr key={atelier.id}>
                                                            <td>{index + 1}</td>
                                                            <td>{atelier.nom}</td>
                                                            <td>{atelier.adresse}</td>
                                                            <td>{atelier.email}</td>
                                                            <td>{atelier.telephone}</td>
                                                            <td>{atelier.dateCreation ? new Date(atelier.dateCreation).toLocaleDateString('fr-FR') : 'N/A'}</td>
                                                            <td>
                                                                {canEdit && (
                                                                    <button
                                                                        className="btn btn-sm btn-info me-1"
                                                                        onClick={() => openModal(atelier)}
                                                                        title="Modifier"
                                                                    >
                                                                        <i className="bx bx-pencil"></i>
                                                                    </button>
                                                                )}
                                                                {canDelete && (
                                                                    <button
                                                                        className="btn btn-sm btn-danger"
                                                                        onClick={() => handleDelete(atelier.id)}
                                                                        title="Supprimer"
                                                                    >
                                                                        <i className="bx bx-trash"></i>
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedMenu === 'abonnement-tarifs' && currentUser.role === 'SUPERADMIN' && (
                        <div className="card">
                            <div className="card-header bg-primary d-flex justify-content-between align-items-center">
                                <h6 className="mb-0 text-white">Configuration des tarifs d'abonnement</h6>
                                <button className="btn btn-sm btn-light" onClick={loadSubscriptionPlans}>
                                    <i className="bx bx-refresh me-1"></i>Rafraîchir
                                </button>
                            </div>
                            <div className="card-body">
                                {planMessage && <div className="alert alert-success py-2">{planMessage}</div>}
                                {planError && <div className="alert alert-danger py-2">{planError}</div>}

                                <div className="border rounded p-3 mb-3">
                                    <h6 className="mb-3">Créer un plan d'abonnement</h6>
                                    <div className="row g-2">
                                        <div className="col-md-2">
                                            <input className="form-control form-control-sm" placeholder="Code" value={newPlan.code} onChange={(e) => setNewPlan((prev) => ({ ...prev, code: e.target.value }))} />
                                        </div>
                                        <div className="col-md-3">
                                            <input className="form-control form-control-sm" placeholder="Libellé" value={newPlan.libelle} onChange={(e) => setNewPlan((prev) => ({ ...prev, libelle: e.target.value }))} />
                                        </div>
                                        <div className="col-md-2">
                                            <input type="number" min={1} className="form-control form-control-sm" placeholder="Durée" value={newPlan.dureeMois} onChange={(e) => setNewPlan((prev) => ({ ...prev, dureeMois: e.target.value }))} />
                                        </div>
                                        <div className="col-md-2">
                                            <input type="number" min={1} className="form-control form-control-sm" placeholder="Montant" value={newPlan.prix} onChange={(e) => setNewPlan((prev) => ({ ...prev, prix: e.target.value }))} />
                                        </div>
                                        <div className="col-md-1">
                                            <input className="form-control form-control-sm" placeholder="Devise" value={newPlan.devise} onChange={(e) => setNewPlan((prev) => ({ ...prev, devise: e.target.value }))} />
                                        </div>
                                        <div className="col-md-1 d-flex align-items-center">
                                            <div className="form-check form-switch m-0">
                                                <input className="form-check-input" type="checkbox" checked={newPlan.actif} onChange={(e) => setNewPlan((prev) => ({ ...prev, actif: e.target.checked }))} />
                                            </div>
                                        </div>
                                        <div className="col-md-1">
                                            <button className="btn btn-sm btn-primary w-100" onClick={onCreateSubscriptionPlan}>Créer</button>
                                        </div>
                                    </div>
                                </div>

                                {planCrudLoading ? (
                                    <div className="text-muted">Chargement des plans...</div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-sm align-middle">
                                            <thead>
                                                <tr>
                                                    <th>Code</th>
                                                    <th>Libellé</th>
                                                    <th>Durée (mois)</th>
                                                    <th>Montant</th>
                                                    <th>Devise</th>
                                                    <th>Actif</th>
                                                    <th style={{ width: 140 }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {subscriptionPlans.map((p) => {
                                                    const code = String(p?.code || '');
                                                    const row = planEdits[code] || { libelle: '', dureeMois: '', prix: '', devise: 'XOF', actif: true };
                                                    return (
                                                        <tr key={`sub-plan-${code}`}>
                                                            <td><strong>{code}</strong></td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm"
                                                                    value={row.libelle}
                                                                    onChange={(e) => setPlanEdits((prev) => ({
                                                                        ...prev,
                                                                        [code]: { ...row, libelle: e.target.value }
                                                                    }))}
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    step="1"
                                                                    className="form-control form-control-sm"
                                                                    value={row.dureeMois}
                                                                    onChange={(e) => setPlanEdits((prev) => ({
                                                                        ...prev,
                                                                        [code]: { ...row, dureeMois: e.target.value }
                                                                    }))}
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    step="1"
                                                                    className="form-control form-control-sm"
                                                                    value={row.prix}
                                                                    onChange={(e) => setPlanEdits((prev) => ({
                                                                        ...prev,
                                                                        [code]: { ...row, prix: e.target.value }
                                                                    }))}
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    maxLength={8}
                                                                    className="form-control form-control-sm"
                                                                    value={row.devise}
                                                                    onChange={(e) => setPlanEdits((prev) => ({
                                                                        ...prev,
                                                                        [code]: { ...row, devise: e.target.value }
                                                                    }))}
                                                                />
                                                            </td>
                                                            <td>
                                                                <div className="form-check form-switch m-0">
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        checked={row.actif}
                                                                        onChange={(e) => setPlanEdits((prev) => ({
                                                                            ...prev,
                                                                            [code]: { ...row, actif: e.target.checked }
                                                                        }))}
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="d-flex gap-2">
                                                                    <button
                                                                        className="btn btn-sm btn-success"
                                                                        onClick={() => onSaveSubscriptionPlan(code)}
                                                                        disabled={planSavingCode === code}
                                                                    >
                                                                        {planSavingCode === code ? '...' : 'Enregistrer'}
                                                                    </button>
                                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => onDeleteSubscriptionPlan(code)}>
                                                                        Supprimer
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {subscriptionPlans.length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="text-muted text-center py-3">Aucun plan trouvé</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedMenu === 'utilisateurs' && (
                        <Signup embedded />
                    )}

                    {selectedMenu === 'assigner' && (
                        <Permissions embedded />
                    )}

                    {selectedMenu === 'liste' && (
                        <ListePermissions embedded />
                    )}
                </div>
            </div>

            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">{isEditing ? "Modifier l'atelier" : 'Ajouter un atelier'}</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Nom de l'atelier <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="nom"
                                            value={formData.nom}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Adresse <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="adresse"
                                            value={formData.adresse}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Email <span className="text-danger">*</span></label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Téléphone <span className="text-danger">*</span></label>
                                        <input
                                            type="tel"
                                            className="form-control"
                                            name="telephone"
                                            value={formData.telephone}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    {currentUser.role === 'SUPERADMIN' && (
                                        <div className="mb-3">
                                            <label className="form-label">Date de création</label>
                                            <input
                                                type="datetime-local"
                                                className="form-control"
                                                name="dateCreation"
                                                value={formData.dateCreation}
                                                onChange={handleInputChange}
                                            />
                                            <div className="form-text">Optionnel - La date actuelle sera utilisée si vide</div>
                                        </div>
                                    )}

                                    {currentUser.role === 'SUPERADMIN' && (
                                        <div className="mb-3">
                                            <label className="form-label">Plan d'abonnement {isEditing ? '(modification)' : '(initial)'}</label>
                                            <select
                                                className="form-select"
                                                value={selectedPlanCode}
                                                onChange={(e) => setSelectedPlanCode(e.target.value)}
                                            >
                                                {(subscriptionPlans.length > 0 ? subscriptionPlans : [
                                                    { code: 'MENSUEL', libelle: 'Mensuel', duree_mois: 1 },
                                                    { code: 'TRIMESTRIEL', libelle: 'Trimestriel', duree_mois: 3 },
                                                    { code: 'SEMESTRIEL', libelle: 'Semestriel', duree_mois: 6 },
                                                    { code: 'ANNUEL', libelle: 'Annuel', duree_mois: 12 }
                                                ]).map((p) => (
                                                    <option key={p.code} value={p.code}>
                                                        {p.libelle} ({p.duree_mois}m)
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="form-text">
                                                {isEditing
                                                    ? "Si vous changez ce plan, un nouvel abonnement actif sera appliqué à cet atelier."
                                                    : "Ce plan sera activé automatiquement à la création de l'atelier."}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary">{isEditing ? 'Enregistrer' : 'Ajouter'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Parametres;