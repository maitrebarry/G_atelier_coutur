import React, { useState, useEffect } from 'react';
import api, { getUserData } from '../api/api';
import Swal from 'sweetalert2';

const Permissions = ({ embedded = false }) => {
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState(new Set());
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const currentUser = getUserData();

  useEffect(() => {
    loadUsers();
    loadAllPermissions();
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/utilisateurs');
      let data = res.data;
      if (currentUser?.role === 'PROPRIETAIRE') {
        data = Array.isArray(data)
          ? data.filter(u => 
              u.id !== currentUser.userId && 
              ['TAILLEUR', 'SECRETAIRE', 'PROPRIETAIRE'].includes(u.role)
            )
          : [];
      }
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      Swal.fire('Erreur', 'Impossible de charger les utilisateurs', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAllPermissions = async () => {
    setLoadingPermissions(true);
    try {
      const res = await api.get('/admin/permissions');
      setPermissions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      Swal.fire('Erreur', 'Impossible de charger les permissions', 'error');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleUserSelect = async (user) => {
    if (currentUser?.role === 'PROPRIETAIRE' && user.role === 'SUPERADMIN') {
      Swal.fire('Erreur', 'Vous ne pouvez pas gérer les permissions de cet utilisateur', 'error');
      return;
    }
    
    setSelectedUser(user);
    try {
      // Si la liste des permissions n'est pas encore chargée, on la charge
      if (!permissions || permissions.length === 0) {
        await loadAllPermissions();
      }

      const res = await api.get(`/admin/utilisateurs/${user.id}/permissions`);
      let userPerms = Array.isArray(res.data) ? res.data.map(p => p.id) : [];

      // Si PROPRIETAIRE ou SUPERADMIN et aucune permission explicite, cocher toutes les permissions par défaut
      if ((user.role === 'PROPRIETAIRE' || user.role === 'SUPERADMIN') && userPerms.length === 0) {
        // fallback : si permissions en state toujours vides, récupérer depuis l'API
        let permsList = permissions;
        if (!Array.isArray(permsList) || permsList.length === 0) {
          try {
            const permsRes = await api.get('/admin/permissions');
            permsList = Array.isArray(permsRes.data) ? permsRes.data : [];
          } catch (e) {
            permsList = [];
          }
        }
        userPerms = permsList.map(p => p.id);
      }

      setUserPermissions(new Set(userPerms));
    } catch (err) {
      console.error(err);
      Swal.fire('Erreur', 'Impossible de charger les permissions de l\'utilisateur', 'error');
    }
  };

  const handlePermissionToggle = (permId) => {
    const newSet = new Set(userPermissions);
    if (newSet.has(permId)) {
      newSet.delete(permId);
    } else {
      newSet.add(permId);
    }
    setUserPermissions(newSet);
  };

  const handleModuleToggle = (module, isChecked) => {
    const modulePerms = permissions.filter(p => p.code.startsWith(module));
    const newSet = new Set(userPermissions);
    modulePerms.forEach(p => {
      if (isChecked) newSet.add(p.id);
      else newSet.delete(p.id);
    });
    setUserPermissions(newSet);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await api.post(`/admin/utilisateurs/${selectedUser.id}/permissions`, Array.from(userPermissions));
      Swal.fire('Succès', 'Permissions mises à jour', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Erreur', 'Impossible de sauvegarder', 'error');
    } finally {
      setSaving(false);
    }
  };

  const clearAllSelections = () => {
    setUserPermissions(new Set());
  };

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, perm) => {
    const module = String(perm.code || '').split('_')[0];
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {});

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    return (
      (u.nom?.toLowerCase().includes(term) || 
       u.prenom?.toLowerCase().includes(term) ||
       u.email?.toLowerCase().includes(term))
    );
  });

  const getRoleBadgeClass = (role) => {
    const classes = {
        'SUPERADMIN': 'bg-danger',
        'PROPRIETAIRE': 'bg-primary',
        'SECRETAIRE': 'bg-info',
        'TAILLEUR': 'bg-warning'
    };
    return classes[role] || 'bg-secondary';
  };

  return (
    <div className={embedded ? '' : 'page-content'}>
      {!embedded && (
        <div className="page-header">
          <div className="container-fluid">
            <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
              <div className="breadcrumb-title pe-3">Paramètres</div>
              <div className="ps-3">
                <nav aria-label="breadcrumb">
                  <ol className="breadcrumb mb-0 p-0">
                    <li className="breadcrumb-item"><a href="#"><i className="bx bx-home-alt"></i></a></li>
                    <li className="breadcrumb-item active" aria-current="page">Gestion des Permissions</li>
                  </ol>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        {/* Users List */}
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-header py-3 bg-primary text-white">
              <h6 className="m-0 font-weight-bold">Utilisateurs</h6>
            </div>
            <div className="card-body">
              <div className="input-group mb-3">
                <span className="input-group-text"><i className="bx bx-search"></i></span>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Rechercher un utilisateur..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="list-group" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {loadingUsers ? (
                  <div className="text-center py-4">Chargement...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-4 text-muted">Aucun utilisateur trouvé</div>
                ) : (
                  filteredUsers.map(user => (
                    <div 
                      key={user.id} 
                      className={`list-group-item list-group-item-action p-3 ${selectedUser?.id === user.id ? 'active' : ''}`}
                      onClick={() => handleUserSelect(user)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex align-items-center">
                        <div className="flex-shrink-0">
                          <div className={`user-avatar rounded-circle d-flex align-items-center justify-content-center text-white ${getRoleBadgeClass(user.role)}`} style={{ width: 40, height: 40 }}>
                            {user.prenom?.charAt(0)}{user.nom?.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <div className="fw-bold">{user.prenom} {user.nom}</div>
                          <div className={`small ${selectedUser?.id === user.id ? 'text-white-50' : 'text-muted'}`}>{user.email}</div>
                          <span className={`badge ${getRoleBadgeClass(user.role)}`}>{user.role}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Permissions List */}
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-header py-3 d-flex justify-content-between align-items-center bg-white border-bottom">
              <h6 className="m-0 font-weight-bold text-primary">
                Permissions de {selectedUser ? `${selectedUser.prenom} ${selectedUser.nom}` : '[Sélectionnez un utilisateur]'}
              </h6>
              {selectedUser && (
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Enregistrement...' : <><i className="bx bx-save me-1"></i>Enregistrer</>}
                </button>
              )}
            </div>
            <div className="card-body p-0">
              {!selectedUser ? (
                <div className="text-center text-muted py-5">
                  <i className="bx bx-user-check bx-lg mb-3"></i>
                  <p className="mb-0">Sélectionnez un utilisateur pour gérer ses permissions</p>
                </div>
              ) : (
                <div style={{ maxHeight: '600px', overflowY: 'auto', padding: '1rem' }}>
                  {Object.keys(permissionsByModule).sort().map(module => {
                    const modulePerms = permissionsByModule[module];
                    const allChecked = modulePerms.every(p => userPermissions.has(p.id));
                    const someChecked = modulePerms.some(p => userPermissions.has(p.id));
                    
                    return (
                      <div key={module} className="card mb-3 border">
                        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2">
                          <div className="form-check mb-0">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              checked={allChecked}
                              ref={el => el && (el.indeterminate = someChecked && !allChecked)}
                              onChange={(e) => handleModuleToggle(module, e.target.checked)}
                            />
                            <label className="form-check-label fw-bold ms-2 text-white">
                              <i className="bx bx-layer me-2"></i>Module : {module}
                            </label>
                          </div>
                          <span className="badge bg-white text-primary">{modulePerms.length}</span>
                        </div>
                        <div className="card-body p-0">
                          <table className="table table-sm table-hover mb-0">
                            <tbody>
                              {modulePerms.map(perm => (
                                <tr key={perm.id} className={userPermissions.has(perm.id) ? 'table-success' : ''}>
                                  <td width="40" className="text-center">
                                    <div className="form-check">
                                      <input 
                                        className="form-check-input" 
                                        type="checkbox" 
                                        checked={userPermissions.has(perm.id)}
                                        onChange={() => handlePermissionToggle(perm.id)}
                                      />
                                    </div>
                                  </td>
                                  <td width="150">
                                    <span className="fw-bold text-uppercase small">{perm.code.split('_')[1] || perm.code}</span>
                                  </td>
                                  <td className="small">{perm.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                    <small className="text-muted">
                      {userPermissions.size} permission(s) sélectionnée(s)
                    </small>
                    <button className="btn btn-sm btn-outline-secondary" onClick={clearAllSelections}>
                      Tout désélectionner
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Permissions;