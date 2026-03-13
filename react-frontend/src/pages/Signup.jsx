import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { getUserData } from '../api/api';
import Swal from 'sweetalert2';
import { Modal } from 'bootstrap';

const emptyForm = {
  nom: '',
  prenom: '',
  email: '',
  motdepasse: '',
  role: '',
  atelierId: ''
};

const Signup = ({ embedded = false }) => {
  const currentUser = getUserData();
  const proprietaireAtelierId = currentUser?.atelierId || currentUser?.atelier?.id || '';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ateliers, setAteliers] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editFormData, setEditFormData] = useState({ ...emptyForm, id: null });

  const addModalRef = useRef(null);
  const editModalRef = useRef(null);
  const addModalInstance = useRef(null);
  const editModalInstance = useRef(null);

  useEffect(() => {
    fetchUsers();
    fetchAteliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (addModalRef.current) {
      addModalInstance.current = new Modal(addModalRef.current);
    }
    if (editModalRef.current) {
      editModalInstance.current = new Modal(editModalRef.current);
    }
    return () => {
      addModalInstance.current?.dispose?.();
      editModalInstance.current?.dispose?.();
    };
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'PROPRIETAIRE' && ateliers.length === 1) {
      setFormData(prev => ({ ...prev, atelierId: ateliers[0].id }));
      setEditFormData(prev => ({ ...prev, atelierId: ateliers[0].id }));
    }
  }, [ateliers, currentUser?.role]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/utilisateurs');
      let data = Array.isArray(res.data) ? res.data : [];

      if (currentUser?.role === 'PROPRIETAIRE') {
        data = data.filter(user => {
          if (user.id === currentUser.userId) {
            return true;
          }
          const sameAtelier = (user.atelier?.id || user.atelierId) === proprietaireAtelierId;
          return sameAtelier && ['TAILLEUR', 'SECRETAIRE'].includes(user.role);
        });
      }

      if (currentUser?.role === 'TAILLEUR' || currentUser?.role === 'SECRETAIRE') {
        data = data.filter(user => user.id === currentUser.userId);
      }

      setUsers(data);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      Swal.fire('Erreur', "Impossible de charger les utilisateurs", 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAteliers = async () => {
    if (!currentUser) return;
    try {
      if (currentUser.role === 'PROPRIETAIRE' && proprietaireAtelierId) {
        const res = await api.get(`/ateliers/${proprietaireAtelierId}`);
        const data = res.data ? [res.data] : [];
        setAteliers(data);
      } else {
        const res = await api.get('/ateliers');
        setAteliers(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      console.error('Erreur chargement ateliers:', error);
      setAteliers([]);
    }
  };

  const availableRoles = (() => {
    if (currentUser?.role === 'SUPERADMIN') {
      return ['SUPERADMIN', 'PROPRIETAIRE', 'SECRETAIRE', 'TAILLEUR'];
    }
    if (currentUser?.role === 'PROPRIETAIRE') {
      return ['SECRETAIRE', 'TAILLEUR'];
    }
    if (currentUser?.role === 'SECRETAIRE' || currentUser?.role === 'TAILLEUR') {
      return [currentUser.role];
    }
    return [];
  })();

  const resetAddForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      motdepasse: '',
      role: currentUser?.role === 'PROPRIETAIRE' ? 'SECRETAIRE' : '',
      atelierId: currentUser?.role === 'PROPRIETAIRE' ? proprietaireAtelierId : ''
    });
  };

  const openAddModal = () => {
    resetAddForm();
    addModalInstance.current?.show();
  };

  const openEditModal = (user) => {
    setEditFormData({
      id: user.id,
      nom: user.nom || '',
      prenom: user.prenom || '',
      email: user.email || '',
      motdepasse: '',
      role: user.role || '',
      atelierId: user.atelier?.id || user.atelierId || ''
    });
    editModalInstance.current?.show();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };

    if (!payload.nom || !payload.prenom || !payload.email || !payload.motdepasse || !payload.role) {
      Swal.fire('Erreur', 'Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    if (currentUser?.role === 'PROPRIETAIRE') {
      if (['PROPRIETAIRE', 'SUPERADMIN'].includes(payload.role)) {
        Swal.fire('Erreur', "Vous ne pouvez pas attribuer ce rôle", 'error');
        return;
      }
      payload.atelierId = proprietaireAtelierId;
    }

    if (!payload.atelierId) {
      delete payload.atelierId;
    }

    try {
      await api.post('/utilisateurs', payload);
      Swal.fire('Succès', 'Utilisateur ajouté avec succès', 'success');
      addModalInstance.current?.hide();
      fetchUsers();
      resetAddForm();
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      Swal.fire('Erreur', error.response?.data?.message || "Impossible d'ajouter l'utilisateur", 'error');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.id) return;

    const payload = {
      nom: editFormData.nom,
      prenom: editFormData.prenom,
      email: editFormData.email,
      role: editFormData.role,
      atelierId: editFormData.atelierId
    };

    if (!payload.nom || !payload.prenom || !payload.email) {
      Swal.fire('Erreur', 'Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    if (editFormData.motdepasse) {
      payload.motdepasse = editFormData.motdepasse;
    }

    if (currentUser?.role === 'PROPRIETAIRE') {
      if (editFormData.id === currentUser.userId) {
        payload.role = 'PROPRIETAIRE';
        payload.atelierId = proprietaireAtelierId;
      } else {
        payload.atelierId = proprietaireAtelierId;
        if (['PROPRIETAIRE', 'SUPERADMIN'].includes(payload.role)) {
          Swal.fire('Erreur', "Vous ne pouvez pas attribuer ce rôle", 'error');
          return;
        }
      }
    }

    if (currentUser?.role === 'SECRETAIRE' || currentUser?.role === 'TAILLEUR') {
      if (editFormData.id !== currentUser.userId) {
        Swal.fire('Erreur', "Vous ne pouvez pas modifier cet utilisateur", 'error');
        return;
      }
      payload.role = currentUser.role;
      delete payload.atelierId;
    }

    if (!payload.atelierId) {
      delete payload.atelierId;
    }

    try {
      await api.put(`/utilisateurs/${editFormData.id}`, payload);
      Swal.fire('Succès', 'Utilisateur mis à jour avec succès', 'success');
      editModalInstance.current?.hide();
      fetchUsers();
    } catch (error) {
      console.error('Erreur modification utilisateur:', error);
      Swal.fire('Erreur', error.response?.data?.message || 'Impossible de modifier utilisateur', 'error');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Cette action est irréversible !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/utilisateurs/${id}`);
        Swal.fire('Supprimé !', "L'utilisateur a été supprimé", 'success');
        fetchUsers();
      } catch (error) {
        console.error('Erreur suppression utilisateur:', error);
        Swal.fire('Erreur', "Impossible de supprimer l'utilisateur", 'error');
      }
    }
  };

  const toggleActivation = async (user) => {
    const activate = !user.actif;
    const actionLabel = activate ? 'activer' : 'désactiver';
    const result = await Swal.fire({
      title: `${activate ? 'Activer' : 'Désactiver'} l'utilisateur`,
      text: `Êtes-vous sûr de vouloir ${actionLabel} cet utilisateur ?`,
      icon: activate ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: activate ? '#28a745' : '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Oui, ${actionLabel}`,
      cancelButtonText: 'Annuler'
    });

    if (!result.isConfirmed) return;

    try {
      const url = `/utilisateurs/${user.id}/${activate ? 'activate' : 'deactivate'}`;
      await api.patch(url);
      Swal.fire('Succès', `Utilisateur ${activate ? 'activé' : 'désactivé'} avec succès`, 'success');
      fetchUsers();
    } catch (error) {
      console.error('Erreur bascule activation:', error);
      Swal.fire('Erreur', `Impossible de ${actionLabel} cet utilisateur`, 'error');
    }
  };

  const canEdit = (user) => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPERADMIN') {
      return user.id !== currentUser.userId;
    }
    if (currentUser.role === 'PROPRIETAIRE') {
      if (user.id === currentUser.userId) return true;
      const sameAtelier = (user.atelier?.id || user.atelierId) === proprietaireAtelierId;
      return sameAtelier && ['SECRETAIRE', 'TAILLEUR'].includes(user.role);
    }
    if (['SECRETAIRE', 'TAILLEUR'].includes(currentUser.role)) {
      return user.id === currentUser.userId;
    }
    return false;
  };

  const canDelete = (user) => {
    return currentUser?.role === 'SUPERADMIN' && user.id !== currentUser.userId;
  };

  const canToggle = (user) => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPERADMIN') {
      return user.id !== currentUser.userId;
    }
    if (currentUser.role === 'PROPRIETAIRE') {
      const sameAtelier = (user.atelier?.id || user.atelierId) === proprietaireAtelierId;
      return sameAtelier && ['SECRETAIRE', 'TAILLEUR'].includes(user.role);
    }
    return false;
  };

  const roleBadgeClass = (role) => {
    const classes = {
      SUPERADMIN: 'bg-danger',
      PROPRIETAIRE: 'bg-primary',
      SECRETAIRE: 'bg-info',
      TAILLEUR: 'bg-warning'
    };
    return classes[role] || 'bg-secondary';
  };

  const renderHeader = () => (
    <div className="page-header">
      <div className="container-fluid">
        <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
          <div className="breadcrumb-title pe-3">Paramètres</div>
          <div className="ps-3">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0 p-0">
                <li className="breadcrumb-item"><Link to="/"><i className="bx bx-home-alt" /></Link></li>
                <li className="breadcrumb-item active" aria-current="page">Gestion des utilisateurs</li>
              </ol>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={embedded ? '' : 'page-content'}>
      {!embedded && renderHeader()}

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center bg-primary text-white">
          <h6 className="mb-0">Liste des utilisateurs</h6>
          {['SUPERADMIN', 'PROPRIETAIRE'].includes(currentUser?.role) && (
            <button type="button" className="btn btn-light btn-sm" onClick={openAddModal}>
              <i className="bx bx-plus me-1" />Ajouter un utilisateur
            </button>
          )}
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>N°</th>
                  <th>Prénom</th>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th style={{ width: '160px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center">Chargement...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">Aucun utilisateur trouvé</td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td>{user.prenom || '-'}</td>
                      <td>{user.nom || '-'}</td>
                      <td>{user.email || '-'}</td>
                      <td>
                        <span className={`badge ${roleBadgeClass(user.role)}`}>{user.role}</span>
                      </td>
                      <td>
                        <span className={`badge ${user.actif ? 'bg-success' : 'bg-danger'}`}>
                          {user.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        {canEdit(user) && (
                          <button className="btn btn-sm btn-warning me-1" onClick={() => openEditModal(user)} title="Modifier">
                            <i className="bx bx-pencil" />
                          </button>
                        )}
                        {canDelete(user) && (
                          <button className="btn btn-sm btn-danger me-1" onClick={() => handleDelete(user.id)} title="Supprimer">
                            <i className="bx bx-trash" />
                          </button>
                        )}
                        {canToggle(user) && (
                          <button
                            className={`btn btn-sm btn-${user.actif ? 'outline-danger' : 'outline-success'}`}
                            onClick={() => toggleActivation(user)}
                            title={user.actif ? 'Désactiver' : 'Activer'}
                          >
                            <i className={`bx bx-user-${user.actif ? 'x' : 'check'}`} />
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

      <div className="modal fade" ref={addModalRef} tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title">Ajouter un utilisateur</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-sm-6">
                    <label className="form-label">Nom <span className="text-danger">*</span></label>
                    <input type="text" name="nom" className="form-control" value={formData.nom} onChange={handleInputChange} required />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label">Prénom <span className="text-danger">*</span></label>
                    <input type="text" name="prenom" className="form-control" value={formData.prenom} onChange={handleInputChange} required />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label">Email <span className="text-danger">*</span></label>
                    <input type="email" name="email" className="form-control" value={formData.email} onChange={handleInputChange} required />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label">Mot de passe <span className="text-danger">*</span></label>
                    <input type="password" name="motdepasse" className="form-control" value={formData.motdepasse} onChange={handleInputChange} required />
                  </div>
                  {(currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'PROPRIETAIRE') && (
                    <div className="col-sm-6">
                      <label className="form-label">Atelier</label>
                      <select
                        name="atelierId"
                        className="form-select"
                        value={formData.atelierId}
                        onChange={handleInputChange}
                        disabled={currentUser?.role === 'PROPRIETAIRE'}
                      >
                        <option value="">Sélectionner un atelier</option>
                        {ateliers.map(atelier => (
                          <option key={atelier.id} value={atelier.id}>{atelier.nom}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="col-sm-6">
                    <label className="form-label">Rôle <span className="text-danger">*</span></label>
                    <select name="role" className="form-select" value={formData.role} onChange={handleInputChange} required>
                      <option value="">Sélectionner un rôle</option>
                      {availableRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="modal fade" ref={editModalRef} tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title">Modifier un utilisateur</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Nom <span className="text-danger">*</span></label>
                  <input type="text" name="nom" className="form-control" value={editFormData.nom} onChange={handleEditInputChange} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Prénom <span className="text-danger">*</span></label>
                  <input type="text" name="prenom" className="form-control" value={editFormData.prenom} onChange={handleEditInputChange} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email <span className="text-danger">*</span></label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    required
                    disabled={['SECRETAIRE', 'TAILLEUR'].includes(currentUser?.role) && editFormData.id === currentUser?.userId}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Mot de passe (laisser vide si inchangé)</label>
                  <input type="password" name="motdepasse" className="form-control" value={editFormData.motdepasse} onChange={handleEditInputChange} />
                </div>
                {(currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'PROPRIETAIRE') && (
                  <div className="mb-3">
                    <label className="form-label">Atelier</label>
                    <select
                      name="atelierId"
                      className="form-select"
                      value={editFormData.atelierId || ''}
                      onChange={handleEditInputChange}
                      disabled={currentUser?.role === 'PROPRIETAIRE'}
                    >
                      <option value="">Sélectionner un atelier</option>
                      {ateliers.map(atelier => (
                        <option key={atelier.id} value={atelier.id}>{atelier.nom}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Rôle <span className="text-danger">*</span></label>
                  <select
                    name="role"
                    className="form-select"
                    value={editFormData.role}
                    onChange={handleEditInputChange}
                    required
                    disabled={currentUser?.role === 'PROPRIETAIRE' && editFormData.id === currentUser?.userId}
                  >
                    {availableRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                    {!availableRoles.includes(editFormData.role) && editFormData.role && (
                      <option value={editFormData.role}>{editFormData.role}</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
