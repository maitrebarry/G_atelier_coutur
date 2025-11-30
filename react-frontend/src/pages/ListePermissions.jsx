import React, { useState, useEffect } from 'react';
import api, { getUserData } from '../api/api';
import Swal from 'sweetalert2';

const ListePermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    code: '',
    description: ''
  });

  useEffect(() => {
    const userData = getUserData();
    setCurrentUser(userData);
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/permissions');
      setPermissions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      Swal.fire('Erreur', 'Impossible de charger les permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (permission = null) => {
    if (permission) {
      setIsEditing(true);
      setFormData({
        id: permission.id,
        code: permission.code,
        description: permission.description
      });
    } else {
      setIsEditing(false);
      setFormData({
        id: '',
        code: '',
        description: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation du code
    if (!/^[A-Z_]+$/.test(formData.code)) {
        Swal.fire('Erreur', 'Le code doit contenir uniquement des lettres majuscules et des underscores', 'error');
        return;
    }

    try {
      if (isEditing) {
        await api.put(`/admin/permissions/${formData.id}`, {
            code: formData.code,
            description: formData.description
        });
        Swal.fire('Succès', 'Permission modifiée avec succès', 'success');
      } else {
        await api.post('/admin/permissions', {
            code: formData.code,
            description: formData.description
        });
        Swal.fire('Succès', 'Permission créée avec succès', 'success');
      }
      setShowModal(false);
      loadPermissions();
    } catch (error) {
      console.error("Erreur sauvegarde permission:", error);
      Swal.fire('Erreur', error.response?.data?.message || 'Impossible de sauvegarder la permission', 'error');
    }
  };

  const handleDelete = async (id, code) => {
    if (currentUser.role !== 'SUPERADMIN') {
        Swal.fire('Erreur', "Seul un SuperAdmin peut supprimer une permission", 'error');
        return;
    }

    const result = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: `Voulez-vous vraiment supprimer la permission "${code}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/admin/permissions/${id}`);
        Swal.fire('Supprimé !', 'La permission a été supprimée.', 'success');
        loadPermissions();
      } catch (error) {
        console.error("Erreur suppression permission:", error);
        Swal.fire('Erreur', 'Impossible de supprimer la permission', 'error');
      }
    }
  };

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, perm) => {
    const module = perm.code.split('_')[0];
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {});

  return (
    <div className="page-content">
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Paramètres</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><a href="/home"><i className="bx bx-home-alt"></i></a></li>
              <li className="breadcrumb-item active" aria-current="page">Liste des Permissions</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-primary d-flex justify-content-between align-items-center">
            <h5 className="mb-0 text-white">Toutes les permissions du système</h5>
            {currentUser && currentUser.role === 'SUPERADMIN' && (
                <button className="btn btn-light btn-sm" onClick={() => openModal()}>
                    <i className="bx bx-plus me-1"></i>Ajouter une permission
                </button>
            )}
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
            </div>
          ) : (
            <div className="row">
              {Object.keys(permissionsByModule).sort().map(module => (
                <div key={module} className="col-md-6 mb-4">
                  <div className="card h-100 border">
                    <div className="card-header bg-primary text-white">
                      <h6 className="mb-0 text-uppercase"><i className="bx bx-layer me-2"></i>Module : {module}</h6>
                    </div>
                    <ul className="list-group list-group-flush">
                      {permissionsByModule[module].map(perm => (
                        <li key={perm.id} className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <span className="fw-bold d-block">{perm.code}</span>
                            <small className="text-muted">{perm.description}</small>
                          </div>
                          {currentUser && currentUser.role === 'SUPERADMIN' && (
                              <div>
                                  <button 
                                      className="btn btn-sm btn-outline-primary me-1" 
                                      onClick={() => openModal(perm)}
                                      title="Modifier"
                                  >
                                      <i className="bx bx-pencil"></i>
                                  </button>
                                  <button 
                                      className="btn btn-sm btn-outline-danger" 
                                      onClick={() => handleDelete(perm.id, perm.code)}
                                      title="Supprimer"
                                  >
                                      <i className="bx bx-trash"></i>
                                  </button>
                              </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title">{isEditing ? 'Modifier la permission' : 'Ajouter une permission'}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Code <span className="text-danger">*</span></label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    name="code" 
                                    value={formData.code} 
                                    onChange={handleInputChange} 
                                    placeholder="EX: MODULE_ACTION"
                                    required 
                                />
                                <div className="form-text">Lettres majuscules et underscores uniquement.</div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Description <span className="text-danger">*</span></label>
                                <textarea 
                                    className="form-control" 
                                    name="description" 
                                    value={formData.description} 
                                    onChange={handleInputChange} 
                                    rows="3"
                                    required 
                                ></textarea>
                            </div>
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
    </div>
  );
};

export default ListePermissions;
