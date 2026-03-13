import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/api';
import Swal from 'sweetalert2';

const menuItems = [
    { route: '/parametres/ateliers', label: 'Ateliers', icon: 'bx bx-home-alt' },
    { route: '/signup', label: 'Utilisateurs', icon: 'bx bx-user' },
    { route: '/permissions', label: 'Assigner Permission', icon: 'bx bx-user-pin' },
    { route: '/liste-permissions', label: 'Liste Permission', icon: 'bx bx-list-ul' }
];

const ParametresAteliers = () => {
    const [ateliers, setAteliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({
        id: '',
        nom: '',
        adresse: '',
        email: '',
        telephone: '',
        dateCreation: ''
    });
    const location = useLocation();

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
        setCurrentUser(userData);

        if (userData && (userData.role === 'SUPERADMIN' || userData.role === 'PROPRIETAIRE')) {
            loadAteliers();
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const openModal = (atelier = null) => {
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
                Swal.fire('Succès', 'Atelier modifié avec succès', 'success');
            } else {
                await api.post('/ateliers', formData);
                Swal.fire('Succès', 'Atelier ajouté avec succès', 'success');
            }
            setShowModal(false);
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
                            <li className="breadcrumb-item"><Link to="/"><i className="bx bx-home-alt"></i></Link></li>
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
                                {menuItems.map((item) => {
                                    const isActive = location.pathname.startsWith(item.route);
                                    return (
                                        <Link
                                            key={item.route}
                                            to={item.route}
                                            className={`list-group-item list-group-item-action border-0 d-flex align-items-center gap-2 py-3 ${isActive ? 'active' : ''}`}
                                        >
                                            <i className={`${item.icon} fs-5`}></i>
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-9">
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
                                                const canEdit = currentUser.role === 'SUPERADMIN' ||
                                                    (currentUser.role === 'PROPRIETAIRE' && currentUser.atelierId === atelier.id);
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
                </div>
            </div>

            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">{isEditing ? 'Modifier l\'atelier' : 'Ajouter un atelier'}</h5>
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

export default ParametresAteliers;
