import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import Swal from 'sweetalert2';

const Header = ({ onToggleSidebar }) => {
  const [userData, setUserData] = useState({ name: 'Chargement...', role: 'Connecté', avatar: '/assets/images/default-user.jpg' });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedRdv, setSelectedRdv] = useState(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const apiBase = (api?.defaults?.baseURL || '').replace(/\/api\/?$/, '');

  useEffect(() => {
    loadUserData();
    fetchNotifications();
    
    // Poll notifications frequently for near-real-time topbar badge updates
    const interval = setInterval(fetchNotifications, 25000);

    const onSubscriptionNotificationUpdated = () => {
      fetchNotifications();
    };

    // Close dropdowns when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('subscription-notification-updated', onSubscriptionNotificationUpdated);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('subscription-notification-updated', onSubscriptionNotificationUpdated);
      clearInterval(interval);
    };
  }, []);

  const loadUserData = async () => {
    const data = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
    if (!data) return;

    const storedPhotoPath = data.photoPath || data.photo || null;
    const storedAvatar = storedPhotoPath
      ? `${apiBase}/user_photo/${storedPhotoPath}?t=${Date.now()}`
      : (data.avatar || '/assets/images/default-user.jpg');

    setUserData({
      name: data.nom || 'Utilisateur',
      role: data.role || 'Connecté',
      avatar: storedAvatar
    });

    try {
      if (!data.userId) return;
      const res = await api.get(`/utilisateurs/${data.userId}/profile`);
      const profile = res?.data || {};
      const photoPath = profile.photoPath || profile.photo || profile.photo_path || null;
      const avatarUrl = photoPath ? `${apiBase}/user_photo/${photoPath}?t=${Date.now()}` : storedAvatar;
      const updated = { ...data, photoPath, avatar: avatarUrl };
      persistUserData(updated);
      setUserData({
        name: updated.nom || 'Utilisateur',
        role: updated.role || 'Connecté',
        avatar: avatarUrl
      });
    } catch (e) {
      /* ignore */
    }
  };

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const getStoredUser = () => {
    const raw = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    return raw ? JSON.parse(raw) : null;
  };

  const persistUserData = (next) => {
    const hasLocal = !!localStorage.getItem('userData');
    if (hasLocal) {
      localStorage.setItem('userData', JSON.stringify(next));
    } else {
      sessionStorage.setItem('userData', JSON.stringify(next));
    }
  };

  const handleChoosePhoto = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'warning', title: 'Fichier invalide', text: 'Veuillez sélectionner une image.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: 'warning', title: 'Taille trop grande', text: 'La taille de l\'image ne doit pas dépasser 5MB.' });
      return;
    }
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const handleSavePhoto = async () => {
    if (!photoFile) {
      Swal.fire({ icon: 'warning', title: 'Photo requise', text: 'Veuillez sélectionner une photo.' });
      return;
    }
    const stored = getStoredUser();
    if (!stored?.userId) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Utilisateur non identifié.' });
      return;
    }
    setPhotoBusy(true);
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      const res = await api.post(`/utilisateurs/${stored.userId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const photoPath = res?.data?.photoPath || res?.data?.path || null;
      const updated = {
        ...stored,
        photoPath,
        avatar: photoPath ? `${apiBase}/user_photo/${photoPath}?t=${Date.now()}` : stored.avatar
      };
      persistUserData(updated);
      setUserData({
        name: updated.nom || 'Utilisateur',
        role: updated.role || 'Connecté',
        avatar: updated.avatar || '/assets/images/default-user.jpg'
      });
      setPhotoFile(null);
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      Swal.fire({ icon: 'success', title: 'Succès', text: 'Photo de profil mise à jour.' });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de mettre à jour la photo.' });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    const stored = getStoredUser();
    if (!stored?.userId) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Utilisateur non identifié.' });
      return;
    }
    setPhotoBusy(true);
    try {
      await api.delete(`/utilisateurs/${stored.userId}/photo`);
      const updated = { ...stored, photoPath: null, avatar: '/assets/images/default-user.jpg' };
      persistUserData(updated);
      setUserData({
        name: updated.nom || 'Utilisateur',
        role: updated.role || 'Connecté',
        avatar: updated.avatar
      });
      setPhotoFile(null);
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      Swal.fire({ icon: 'success', title: 'Supprimée', text: 'Photo supprimée.' });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de supprimer la photo.' });
    } finally {
      setPhotoBusy(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications/unread');
      setNotifications(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des notifications", error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error("Erreur lors du marquage de la notification", error);
    }
  };

  const handleNotificationClick = async (notif) => {
    await markAsRead(notif.id);
    setActiveDropdown(null);
    const type = String(notif?.type || '').toUpperCase();
    if (type === 'ABONNEMENT') {
      navigate('/abonnement');
      return;
    }
    if (type === 'RENDEZ_VOUS' && notif.relatedEntityId) {
      try {
        const response = await api.get(`/rendezvous/${notif.relatedEntityId}`);
        setSelectedRdv(response.data);
        setShowReminderModal(true);
      } catch (error) {
        console.error('Erreur chargement du rappel de rendez-vous', error);
      }
    }
  };

  const getNotificationTitle = (notif) => {
    const type = String(notif?.type || '').toUpperCase();
    if (type === 'RENDEZ_VOUS') return 'Rappel Rendez-vous';
    if (type === 'ABONNEMENT') return 'Alerte abonnement';
    return 'Notification';
  };

  const formatRdvType = (type) => {
    if (!type) return 'Rendez-vous';
    const normalized = String(type).trim().toUpperCase();
    if (normalized === 'PRISE DE MESURES') return "LIVRAISON DE L'HABIT";
    return type;
  };

  const formatDateTime = (value) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) + ' à ' + date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return value;
    }
  };

  const closeReminderModal = () => {
    setShowReminderModal(false);
    setSelectedRdv(null);
  };

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('userData');
    navigate('/login');
  };

  const toggleDropdown = (name) => {
    if (activeDropdown === name) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(name);
    }
  };

  return (
    <>
      <header ref={dropdownRef}>
        <div className="topbar d-flex align-items-center">
          <nav className="navbar navbar-expand">
            <div className="mobile-toggle-menu" onClick={onToggleSidebar} role="button" tabIndex={0} onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleSidebar();
              }
            }}>
              <i className='bx bx-menu'></i>
            </div>
            <div className="top-menu ms-auto">
              <ul className="navbar-nav align-items-center">
                <li className={`nav-item dropdown dropdown-large ${activeDropdown === 'notifications' ? 'show' : ''}`}>
                  <a 
                    className="nav-link dropdown-toggle dropdown-toggle-nocaret position-relative" 
                    href="#" 
                    role="button" 
                    onClick={(e) => { e.preventDefault(); toggleDropdown('notifications'); }}
                    aria-expanded={activeDropdown === 'notifications'}
                  >
                    {notifications.length > 0 && <span className="alert-count">{notifications.length}</span>}
                    <i className='bx bx-bell'></i>
                  </a>
                  <div className={`dropdown-menu dropdown-menu-end ${activeDropdown === 'notifications' ? 'show' : ''}`} data-bs-popper={activeDropdown === 'notifications' ? 'static' : null}>
                    <a href="javascript:;">
                      <div className="msg-header">
                        <p className="msg-header-title">Notifications</p>
                        <p className="msg-header-clear ms-auto">Non lues</p>
                      </div>
                    </a>
                    <div className="header-notifications-list">
                      {notifications.length === 0 ? (
                        <div className="text-center p-3">Aucune nouvelle notification</div>
                      ) : (
                        notifications.map(notif => (
                          <a className="dropdown-item" href="javascript:;" key={notif.id} onClick={() => handleNotificationClick(notif)}>
                            <div className="d-flex align-items-center">
                              <div className="notify bg-light-primary text-primary"><i className="bx bx-calendar"></i>
                              </div>
                              <div className="flex-grow-1">
                                <h6 className="msg-name">{getNotificationTitle(notif)} <span className="msg-time float-end">{new Date(notif.dateCreation).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></h6>
                                <p className="msg-info">{notif.message}</p>
                              </div>
                            </div>
                          </a>
                        ))
                      )}
                    </div>
                    <a href="javascript:;">
                      <div className="text-center msg-footer">Voir toutes les notifications</div>
                    </a>
                  </div>
                </li>
                <li className={`nav-item dropdown dropdown-large ${activeDropdown === 'messages' ? 'show' : ''}`}>
                  <a 
                    className="nav-link dropdown-toggle dropdown-toggle-nocaret position-relative" 
                    href="#" 
                    role="button" 
                    onClick={(e) => { e.preventDefault(); toggleDropdown('messages'); }}
                    aria-expanded={activeDropdown === 'messages'}
                  >
                    <i className='bx bx-envelope'></i>
                  </a>
                  <div className={`dropdown-menu dropdown-menu-end ${activeDropdown === 'messages' ? 'show' : ''}`} data-bs-popper={activeDropdown === 'messages' ? 'static' : null}>
                    <a href="javascript:;">
                      <div className="msg-header">
                        <p className="msg-header-title">Messages</p>
                      </div>
                    </a>
                    <div className="header-message-list">
                      {/* Messages will be populated here */}
                    </div>
                  </div>
                </li>
              </ul>
            </div>
            <div className={`user-box dropdown ${activeDropdown === 'user' ? 'show' : ''}`}>
              <a 
                className="d-flex align-items-center nav-link dropdown-toggle dropdown-toggle-nocaret" 
                href="#" 
                role="button" 
                onClick={(e) => { e.preventDefault(); toggleDropdown('user'); }}
                aria-expanded={activeDropdown === 'user'}
              >
                <img src={userData.avatar} className="user-img" alt="user avatar" />
                <div className="user-info ps-3">
                  <p className="user-name mb-0">{userData.name}</p>
                  <p className="designattion mb-0">{userData.role}</p>
                </div>
              </a>
              <ul className={`dropdown-menu dropdown-menu-end ${activeDropdown === 'user' ? 'show' : ''}`} data-bs-popper={activeDropdown === 'user' ? 'static' : null}>
                <li>
                  <a className="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#profileModal">
                    <i className="bx bx-user"></i><span>Mon Profil</span>
                  </a>
                </li>
                <li><div className="dropdown-divider mb-0"></div></li>
                <li>
                  <a className="dropdown-item" href="#" onClick={handleLogout}>
                    <i className='bx bx-log-out-circle'></i><span>Déconnexion</span>
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </header>

      {/* Profile Modal */}
      <div className="modal fade" id="profileModal" tabIndex="-1" aria-labelledby="profileModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title" id="profileModalLabel">
                <i className="bx bx-user-circle me-2"></i>Mon Profil
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-4 text-center border-end">
                  <img id="profileAvatar" src={userData.avatar} alt="Photo de profil"
                    className="rounded-circle shadow mb-3" width="150" height="150" style={{objectFit: 'cover'}} />
                  <input
                    type="file"
                    id="photoUpload"
                    accept="image/*"
                    className="d-none"
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                  />
                  <button className="btn btn-outline-primary btn-sm w-100 mb-2" id="changePhotoBtn" onClick={handleChoosePhoto} disabled={photoBusy}>
                    <i className="bx bx-camera me-1"></i>Changer la photo
                  </button>
                  <button className="btn btn-outline-danger btn-sm w-100" id="removePhotoBtn" onClick={handleRemovePhoto} disabled={photoBusy}>
                    <i className="bx bx-trash me-1"></i>Supprimer
                  </button>
                  <div id="photoPreviewContainer" className="mt-3" style={{display: photoPreviewUrl ? 'block' : 'none'}}>
                    <img id="previewImage" src={photoPreviewUrl || ''} className="rounded shadow" width="100" height="100" style={{objectFit: 'cover'}} />
                    <button className="btn btn-success btn-sm w-100 mt-2" id="savePhotoBtn" onClick={handleSavePhoto} disabled={photoBusy}>
                      <i className="bx bx-check me-1"></i>Enregistrer la photo
                    </button>
                  </div>
                </div>
                <div className="col-md-8">
                  <h6 className="mb-3"><i className="bx bx-lock me-2"></i>Changer le mot de passe</h6>
                  <form id="changePasswordForm">
                    <div className="row g-3">
                      <div className="col-12">
                        <label>Mot de passe actuel</label>
                        <input type="password" className="form-control" id="currentPassword" required />
                      </div>
                      <div className="col-12">
                        <label>Nouveau mot de passe</label>
                        <input type="password" className="form-control" id="newPassword" required />
                      </div>
                      <div className="col-12">
                        <label>Confirmer le mot de passe</label>
                        <input type="password" className="form-control" id="confirmPassword" required />
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                <i className="bx bx-x me-1"></i>Fermer
              </button>
              <button type="submit" form="changePasswordForm" className="btn btn-success">
                <i className="bx bx-check-shield me-1"></i>Changer mot de passe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reminder Modal */}
      <div className={`modal fade${showReminderModal ? ' show' : ''}`} tabIndex="-1" aria-labelledby="reminderModalLabel" aria-hidden={!showReminderModal} style={{ display: showReminderModal ? 'block' : 'none' }}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header bg-warning text-dark">
              <h5 className="modal-title" id="reminderModalLabel">
                <i className="bx bx-bell me-2"></i>Rappel de rendez-vous
              </h5>
              <button type="button" className="btn-close" aria-label="Fermer" onClick={closeReminderModal}></button>
            </div>
            <div className="modal-body">
              {selectedRdv ? (
                <>
                  <div className="mb-3">
                    <strong>Client :</strong> {selectedRdv.client?.prenom} {selectedRdv.client?.nom}
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="border rounded p-3">
                        <h6 className="mb-2">Coordonnées</h6>
                        <p className="mb-1"><strong>Téléphone :</strong> {selectedRdv.client?.contact || 'N/A'}</p>
                        <p className="mb-1"><strong>Email :</strong> {selectedRdv.client?.email || 'N/A'}</p>
                        <p className="mb-0"><strong>Adresse :</strong> {selectedRdv.client?.adresse || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border rounded p-3">
                        <h6 className="mb-2">Détails du rendez-vous</h6>
                        <p className="mb-1"><strong>Date :</strong> {formatDateTime(selectedRdv.dateRDV)}</p>
                        <p className="mb-1"><strong>Type :</strong> {formatRdvType(selectedRdv.typeRendezVous)}</p>
                        <p className="mb-1"><strong>Statut :</strong> {selectedRdv.statut || 'N/A'}</p>
                        <p className="mb-0"><strong>Atelier :</strong> {selectedRdv.atelier?.nom || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  {selectedRdv.notes && (
                    <div className="mt-3 border rounded p-3 bg-light">
                      <h6>Notes</h6>
                      <p className="mb-0">{selectedRdv.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <div>Chargement des détails du rendez-vous...</div>
              )}
            </div>
            <div className="modal-footer">
              {selectedRdv?.client?.id && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowReminderModal(false);
                    navigate(`/clients?clientId=${selectedRdv.client.id}`);
                  }}
                >
                  Voir les mesures du client
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={closeReminderModal}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
      {showReminderModal && <div className="modal-backdrop fade show"></div>}
    </>
  );
};

export default Header;