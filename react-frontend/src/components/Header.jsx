import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const Header = () => {
  const [userData, setUserData] = useState({ name: 'Chargement...', role: 'Connecté', avatar: '/assets/images/default-user.jpg' });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadUserData();
    fetchNotifications();
    
    // Poll notifications every minute
    const interval = setInterval(fetchNotifications, 60000);

    // Close dropdowns when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(interval);
    };
  }, []);

  const loadUserData = () => {
    const data = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
    if (data) {
      setUserData({
        name: data.nom || 'Utilisateur',
        role: data.role || 'Connecté',
        avatar: data.avatar || '/assets/images/default-user.jpg'
      });
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
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error("Erreur lors du marquage de la notification", error);
    }
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
            <div className="mobile-toggle-menu"><i className='bx bx-menu'></i></div>
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
                          <a className="dropdown-item" href="javascript:;" key={notif.id} onClick={() => markAsRead(notif.id)}>
                            <div className="d-flex align-items-center">
                              <div className="notify bg-light-primary text-primary"><i className="bx bx-calendar"></i>
                              </div>
                              <div className="flex-grow-1">
                                <h6 className="msg-name">{notif.type === 'RENDEZ_VOUS' ? 'Rappel Rendez-vous' : 'Notification'} <span className="msg-time float-end">{new Date(notif.dateCreation).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></h6>
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
                  <input type="file" id="photoUpload" accept="image/*" className="d-none" />
                  <button className="btn btn-outline-primary btn-sm w-100 mb-2" id="changePhotoBtn">
                    <i className="bx bx-camera me-1"></i>Changer la photo
                  </button>
                  <button className="btn btn-outline-danger btn-sm w-100" id="removePhotoBtn">
                    <i className="bx bx-trash me-1"></i>Supprimer
                  </button>
                  <div id="photoPreviewContainer" className="mt-3" style={{display: 'none'}}>
                    <img id="previewImage" src="" className="rounded shadow" width="100" height="100" style={{objectFit: 'cover'}} />
                    <button className="btn btn-success btn-sm w-100 mt-2" id="savePhotoBtn">
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
    </>
  );
};

export default Header;