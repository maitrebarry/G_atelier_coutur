import React, { useState, useEffect, useRef } from 'react';
import api, { getUserData } from '../api/api';
import Swal from 'sweetalert2';
import { Modal } from 'bootstrap';

const Signup = () => {
    const [users, setUsers] = useState([]);
    const [ateliers, setAteliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const currentUser = getUserData();
    
    // Form states
    const [formData, setFormData] = useState({
        nom: '', prenom: '', email: '', motdepasse: '', atelierId: '', role: ''
    });
    const [editFormData, setEditFormData] = useState({
        id: '', nom: '', prenom: '', email: '', motdepasse: '', atelierId: '', role: ''
    });

    // Refs for modals
    const addModalRef = useRef(null);
    const editModalRef = useRef(null);
    const [addModalInstance, setAddModalInstance] = useState(null);
    const [editModalInstance, setEditModalInstance] = useState(null);

    useEffect(() => {
        // Initialize modals
        if (addModalRef.current) {
            setAddModalInstance(new Modal(addModalRef.current));
        }
        if (editModalRef.current) {
            setEditModalInstance(new Modal(editModalRef.current));
        }
        
        loadUsers();
        if (['SUPERADMIN', 'PROPRIETAIRE'].includes(currentUser?.role)) {
            loadAteliers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/utilisateurs');
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            Swal.fire('Erreur', 'Impossible de charger les utilisateurs', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadAteliers = async () => {
        try {
            let url = '/ateliers';
            if (currentUser.role === 'PROPRIETAIRE' && currentUser.atelierId) {
                url = `/ateliers/${currentUser.atelierId}`;
            }
            const res = await api.get(url);
            setAteliers(Array.isArray(res.data) ? res.data : [res.data]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData({ ...editFormData, [name]: value });
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/utilisateurs', formData);
            Swal.fire('Succès', 'Utilisateur créé avec succès', 'success');
            setFormData({ nom: '', prenom: '', email: '', motdepasse: '', atelierId: '', role: '' });
            addModalInstance?.hide();
            loadUsers();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Erreur lors de la création';
            Swal.fire('Erreur', msg, 'error');
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                nom: editFormData.nom,
                prenom: editFormData.prenom,
                email: editFormData.email,
            };
            if (editFormData.motdepasse) payload.motdepasse = editFormData.motdepasse;
            
            // Role & Atelier logic
            if (currentUser.role === 'SUPERADMIN') {
                payload.atelierId = editFormData.atelierId;
                payload.role = editFormData.role;
            } else if (currentUser.role === 'PROPRIETAIRE') {
                if (editFormData.id === currentUser.userId) {
                     payload.role = 'PROPRIETAIRE';
                     payload.atelierId = editFormData.atelierId;
                } else {
                     payload.atelierId = editFormData.atelierId;
                     payload.role = editFormData.role;
                }
            }

            await api.put(`/utilisateurs/${editFormData.id}`, payload);
            Swal.fire('Succès', 'Utilisateur modifié avec succès', 'success');
            editModalInstance?.hide();
            loadUsers();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Erreur lors de la modification';
            Swal.fire('Erreur', msg, 'error');
        }
    };

    const openEditModal = (user) => {
        setEditFormData({
            id: user.id,
            nom: user.nom || '',
            prenom: user.prenom || '',
            email: user.email || '',
            motdepasse: '',
            atelierId: user.atelier?.id || user.atelierId || '',
            role: user.role || ''
        });
        editModalInstance?.show();
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: "Cette action est irréversible !",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Oui, supprimer !'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/utilisateurs/${id}`);
                Swal.fire('Supprimé!', 'L\'utilisateur a été supprimé.', 'success');
                loadUsers();
            } catch (err) {
                Swal.fire('Erreur', 'Impossible de supprimer l\'utilisateur', 'error');
            }
        }
    };

    const toggleActivation = async (user) => {
        const action = user.actif ? 'deactivate' : 'activate';
        const confirmText = user.actif ? 'Désactiver' : 'Activer';
        
        const result = await Swal.fire({
            title: `${confirmText} l'utilisateur ?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `Oui, ${confirmText.toLowerCase()}`
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/utilisateurs/${user.id}/${action}`);
                Swal.fire('Succès', `Utilisateur ${confirmText.toLowerCase()} avec succès`, 'success');
                loadUsers();
            } catch (err) {
                Swal.fire('Erreur', `Impossible de ${action} l'utilisateur`, 'error');
            }
        }
    };

    // Permission helpers
    const getUserAtelierId = (user) => user.atelierId || user.atelier?.id;

    const canEdit = (user) => {
        if (currentUser.role === 'SUPERADMIN') return user.id !== currentUser.userId;
        if (currentUser.role === 'PROPRIETAIRE') {
            if (user.id === currentUser.userId) return true;
            const userAtelierId = getUserAtelierId(user);
            const isSubordinate = ['SECRETAIRE', 'TAILLEUR'].includes(user.role) && userAtelierId === currentUser.atelierId;
            return isSubordinate;
        }
        if (['TAILLEUR', 'SECRETAIRE'].includes(currentUser.role)) {
            return user.id === currentUser.userId;
        }
        return false;
    };

    const canDelete = (user) => {
        if (currentUser.role === 'SUPERADMIN') return user.id !== currentUser.userId;
        if (currentUser.role === 'PROPRIETAIRE') {
            // Can delete employees of their atelier (Tailleur, Secretaire)
            const userAtelierId = getUserAtelierId(user);
            return userAtelierId === currentUser.atelierId && ['TAILLEUR', 'SECRETAIRE'].includes(user.role);
        }
        return false;
    };

    const canToggle = (user) => {
        if (currentUser.role === 'SUPERADMIN') return user.id !== currentUser.userId;
        if (currentUser.role === 'PROPRIETAIRE') {
            const userAtelierId = getUserAtelierId(user);
            const isSubordinate = ['SECRETAIRE', 'TAILLEUR'].includes(user.role) && userAtelierId === currentUser.atelierId;
            return isSubordinate;
        }
        return false;
    };

    return (
        <>
            <div className="page-header">
                <div className="container-fluid">
                    <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
                        <div className="breadcrumb-title pe-3">Paramètres</div>
                        <div className="ps-3">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb mb-0 p-0">
                                    <li className="breadcrumb-item"><a href="/"><i className="bx bx-home-alt"></i></a></li>
                                    <li className="breadcrumb-item active" aria-current="page">Gestion des Utilisateurs</li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-12 col-lg-3">
                    <div className="card">
                        <div className="card-header bg-primary">
                            <h6 className="mb-0 text-center text-white">Menu</h6>
                        </div>
                        <div className="card-body">
                            <div className="fm-menu">
                                <div className="list-group list-group-flush">
                                     {/* Menu items would go here */}
                                     <button className="list-group-item py-1 border-0 bg-transparent text-start w-100"><i className='bx bx-user me-2'></i>Utilisateurs</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-9">
                    <div className="card">
                        <div className="card-header bg-primary d-flex justify-content-between align-items-center">
                            <h6 className="mb-0 text-center text-white flex-grow-1">Liste des utilisateurs</h6>
                            {['SUPERADMIN', 'PROPRIETAIRE'].includes(currentUser.role) && (
                                <button type="button" className="btn btn-light btn-sm" onClick={() => addModalInstance?.show()}>
                                    Ajouter un utilisateur
                                </button>
                            )}
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>N°</th>
                                            <th>Prenom</th>
                                            <th>Nom</th>
                                            <th>Email</th>
                                            <th>Fonction</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="6" className="text-center">Chargement...</td></tr>
                                        ) : users.length === 0 ? (
                                            <tr><td colSpan="6" className="text-center">Aucun utilisateur trouvé</td></tr>
                                        ) : (
                                            users.map((user, index) => (
                                                <tr key={user.id}>
                                                    <td>{index + 1}</td>
                                                    <td>{user.prenom}</td>
                                                    <td>{user.nom}</td>
                                                    <td>{user.email}</td>
                                                    <td>{user.role}</td>
                                                    <td>
                                                        {canEdit(user) && (
                                                            <button className="btn btn-sm btn-warning me-1" onClick={() => openEditModal(user)}>
                                                                <i className="bx bx-pencil"></i>
                                                            </button>
                                                        )}
                                                        {canDelete(user) && (
                                                            <button className="btn btn-sm btn-danger me-1" onClick={() => handleDelete(user.id)}>
                                                                <i className="bx bx-trash"></i>
                                                            </button>
                                                        )}
                                                        {canToggle(user) && (
                                                            <button 
                                                                className={`btn btn-sm btn-${user.actif ? 'danger' : 'success'}`} 
                                                                onClick={() => toggleActivation(user)}
                                                                title={user.actif ? 'Désactiver' : 'Activer'}
                                                            >
                                                                <i className={`bx bx-user-${user.actif ? 'x' : 'check'}`}></i>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            <div className="modal fade" ref={addModalRef} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header bg-primary">
                            <h5 className="modal-title text-white">Ajouter un utilisateur</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div className="modal-body">
                            <form id="addUserForm" onSubmit={handleAddSubmit}>
                                <div className="row g-3">
                                    <div className="col-sm-6">
                                        <label className="form-label">Nom</label>
                                        <input type="text" className="form-control" name="nom" value={formData.nom} onChange={handleInputChange} required />
                                    </div>
                                    <div className="col-sm-6">
                                        <label className="form-label">Prénom</label>
                                        <input type="text" className="form-control" name="prenom" value={formData.prenom} onChange={handleInputChange} required />
                                    </div>
                                    <div className="col-sm-6">
                                        <label className="form-label">Email</label>
                                        <input type="email" className="form-control" name="email" value={formData.email} onChange={handleInputChange} required />
                                    </div>
                                    <div className="col-sm-6">
                                        <label className="form-label">Mot de passe</label>
                                        <input type="password" className="form-control" name="motdepasse" value={formData.motdepasse} onChange={handleInputChange} required />
                                    </div>
                                    
                                    {['SUPERADMIN', 'PROPRIETAIRE'].includes(currentUser.role) && (
                                        <div className="col-sm-6">
                                            <label className="form-label">Atelier</label>
                                            <select className="form-select" name="atelierId" value={formData.atelierId} onChange={handleInputChange}>
                                                <option value="">Sélectionner un atelier</option>
                                                {ateliers.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div className="col-sm-6">
                                        <label className="form-label">Rôle</label>
                                        <select className="form-select" name="role" value={formData.role} onChange={handleInputChange} required>
                                            <option value="">Sélectionner un rôle</option>
                                            {currentUser.role === 'SUPERADMIN' && (
                                                <>
                                                    <option value="SUPERADMIN">Super Admin</option>
                                                    <option value="PROPRIETAIRE">Propriétaire</option>
                                                </>
                                            )}
                                            <option value="SECRETAIRE">Secrétaire</option>
                                            <option value="TAILLEUR">Tailleur</option>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                            <button type="submit" form="addUserForm" className="btn btn-primary">Enregistrer</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
                        <div className="modal fade" ref={editModalRef} tabIndex="-1">
                            <div className="modal-dialog">
                                <div className="modal-content">
                                    <div className="modal-header bg-primary">
                                        <h5 className="modal-title text-white">Modifier utilisateur</h5>
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body">
                                        <form id="editUserForm" onSubmit={handleEditSubmit}>
                                            <div className="mb-3">
                                                <label>Nom</label>
                                                <input type="text" className="form-control" name="nom" value={editFormData.nom} onChange={handleEditInputChange} required />
                                            </div>
                                            <div className="mb-3">
                                                <label>Prénom</label>
                                                <input type="text" className="form-control" name="prenom" value={editFormData.prenom} onChange={handleEditInputChange} required />
                                            </div>
                                            <div className="mb-3">
                                                <label>Email</label>
                                                <input type="email" className="form-control" name="email" value={editFormData.email} onChange={handleEditInputChange} required disabled={['TAILLEUR', 'SECRETAIRE'].includes(currentUser.role)} />
                                            </div>
                                            <div className="mb-3">
                                                <label>Mot de passe (laisser vide si inchangé)</label>
                                                <input type="password" className="form-control" name="motdepasse" value={editFormData.motdepasse} onChange={handleEditInputChange} />
                                            </div>

                                            {['SUPERADMIN', 'PROPRIETAIRE'].includes(currentUser.role) && (
                                                <>
                                                    <div className="mb-3">
                                                        <label>Atelier</label>
                                                        <select className="form-select" name="atelierId" value={editFormData.atelierId} onChange={handleEditInputChange}>
                                                            <option value="">Sélectionner un atelier</option>
                                                            {ateliers.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                                                        </select>
                                                    </div>

                                                    <div className="mb-3">
                                                        <label>Rôle</label>
                                                        <select
                                                            className="form-select"
                                                            name="role"
                                                            value={editFormData.role}
                                                            onChange={handleEditInputChange}
                                                            disabled={currentUser.role === 'PROPRIETAIRE' && (editFormData.role === 'PROPRIETAIRE' || editFormData.role === 'SUPERADMIN')}
                                                        >
                                                            <option value="">Sélectionner un rôle</option>
                                                            {currentUser.role === 'SUPERADMIN' && (
                                                                <>
                                                                    <option value="SUPERADMIN">Super Admin</option>
                                                                    <option value="PROPRIETAIRE">Propriétaire</option>
                                                                </>
                                                            )}
                                                            <option value="SECRETAIRE">Secrétaire</option>
                                                            <option value="TAILLEUR">Tailleur</option>
                                                        </select>
                                                    </div>
                                                </>
                                            )}
                                        </form>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                                        <button type="submit" form="editUserForm" className="btn btn-primary">Mettre à jour</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </>
                );
            };

            export default Signup;
