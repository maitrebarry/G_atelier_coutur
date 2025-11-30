import React, { useState, useEffect } from 'react';
import api from '../api/api';
import Swal from 'sweetalert2';

const Parametres = () => {
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

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
        setCurrentUser(userData);
        loadAteliers();
    }, []);

    const loadAteliers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/ateliers');
            setAteliers(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Erreur chargement ateliers:", error);
            Swal.fire('Erreur', 'Impossible de charger les ateliers', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
        try {
            if (isEditing) {
                // Check permissions
                if (currentUser.role === 'PROPRIETAIRE' && currentUser.atelierId !== formData.id) {
                    Swal.fire('Erreur', "Vous n'avez pas la permission de modifier cet atelier", 'error');
                    return;
                }

                const payload = { ...formData };
                // Only SUPERADMIN can change dateCreation
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
            console.error("Erreur sauvegarde atelier:", error);
            Swal.fire('Erreur', 'Impossible de sauvegarder l\'atelier', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (currentUser.role !== 'SUPERADMIN') {
            Swal.fire('Erreur', "Seul un SuperAdmin peut supprimer un atelier", 'error');
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
                console.error("Erreur suppression atelier:", error);
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
                                                <span class="visually-hidden">Chargement...</span>
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

            {/* Modal */}
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
                                        <label className="form-label">Adresse <span class="text-danger">*</span></label>
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
                                        <label className="form-label">Email <span class="text-danger">*</span></label>
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
                                        <label className="form-label">Téléphone <span class="text-danger">*</span></label>
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

export default Parametres;