import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { setAuthData } from '../api/api';
import Swal from 'sweetalert2';
import '../assets/css/index.css';

const backgroundImages = [
  { url: '/assets/images/jupe0.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe1.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe2.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe4.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe5.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe6.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe7.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe8.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe9.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe10.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/model1.png', title: 'Modèle Exclusive' },
  { url: '/assets/images/model2.png', title: 'Modèle Exclusive' },
  { url: '/assets/images/model3.jpg', title: 'Nouvelle Collection' },
  { url: '/assets/images/model4.jpg', title: 'Nouvelle Collection' },
  { url: '/assets/images/model5.jpg', title: 'Nouvelle Collection' }
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      navigate('/home');
    }
  }, [navigate]);

  // Carousel auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + backgroundImages.length) % backgroundImages.length);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!email || !password) {
        Swal.fire('Champs manquants', 'Veuillez remplir tous les champs', 'error');
        return;
      }

      const res = await api.post('/auth/login', { email, password });
      const response = res.data || {};
      console.log('Login response:', response);

      const token = response.token || response.accessToken || response.authToken;
      if (!token) {
        throw new Error(response.error || response.message || 'Pas de token reçu');
      }

      // Fetch permissions
      let permissions = [];
      
      // 1. Check if permissions are already in the login response
      if (response.permissions && Array.isArray(response.permissions)) {
          permissions = response.permissions.map(p => typeof p === 'string' ? p : p.code);
      } else if (response.user && response.user.permissions && Array.isArray(response.user.permissions)) {
          permissions = response.user.permissions.map(p => typeof p === 'string' ? p : p.code);
      } else {
          // 2. Fetch from API
          try {
              const userId = response.id || response.user?.id;
              
              // Try the standard user endpoint first (likely accessible by the user)
              try {
                  const permRes = await api.get(`/utilisateurs/${userId}/permissions`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (Array.isArray(permRes.data)) {
                      permissions = permRes.data.map(p => p.code);
                  }
              } catch (e) {
                  console.log('Failed to fetch from /utilisateurs/... trying /admin/...');
                  // Fallback to admin endpoint (might fail for non-admins)
                  const permRes = await api.get(`/admin/utilisateurs/${userId}/permissions`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (Array.isArray(permRes.data)) {
                      permissions = permRes.data.map(p => p.code);
                  }
              }
          } catch (permErr) {
              console.warn('Could not fetch permissions:', permErr);
          }
      }
      
      console.log('Final Permissions loaded:', permissions);

      // Robust userData extraction to match Bootstrap logic
      const userData = {
        token: token,
        userId: response.id || response.user?.id,
        email: response.email || response.user?.email,
        prenom: response.prenom || response.user?.prenom,
        nom: response.nom || response.user?.nom,
        role: response.role || response.user?.role,
        atelierId: response.atelierId || response.user?.atelierId,
        permissions: permissions
      };

      setAuthData(token, userData, remember);
      navigate('/home');
    } catch (err) {
      console.error('Login exception:', err);
      let text = 'Échec de connexion';
      if (err?.response?.data) {
        text = err.response.data.error || err.response.data.message || JSON.stringify(err.response.data);
      } else if (err?.message) {
        text = err.message;
      }
      if (text === 'Network Error') {
        text = 'Impossible de se connecter au serveur';
      }
      Swal.fire('Erreur', text, 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentImage = backgroundImages[currentImageIndex];

  return (
    <div className="split-screen">
      <div className="left-half">
        <div className="login-container">
          <div className="mb-4 text-center">
            <img
              src="/assets/images/logo_ateliko.png"
              style={{ width: '40%', maxWidth: 250, height: 'auto', objectFit: 'contain' }}
              alt="Logo"
            />
            <h3 className="logo-text">ATELIKO</h3>
          </div>

          <div className="login-separater text-center mb-4">
            <span>CONNEXION AVEC EMAIL</span>
            <hr />
          </div>

          <div className="form-body">
            <form className="row g-3" onSubmit={handleSubmit}>
              <div className="col-12">
                <label htmlFor="inputEmailAddress" className="form-label">
                  Adresse Email
                </label>
                <input
                  id="inputEmailAddress"
                  type="email"
                  className="form-control"
                  placeholder="Adresse Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="col-12">
                <label htmlFor="inputChoosePassword" className="form-label">
                  Mot de passe
                </label>
                <div className="input-group" id="show_hide_password">
                  <input
                    id="inputChoosePassword"
                    type={showPassword ? "text" : "password"}
                    className="form-control border-end-0"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-group-text bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ border: '1px solid #ced4da', borderLeft: 'none' }}
                  >
                    <i className={`bx ${showPassword ? 'bx-show' : 'bx-hide'}`}></i>
                  </button>
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="rememberMe"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="rememberMe">
                    Se souvenir de moi
                  </label>
                </div>
              </div>
              <div className="col-md-6 text-end">
                <Link className="text-primary" to="/forgot-password">
                  Mot de passe oublié?
                </Link>
              </div>

              <div className="col-12">
                <div className="d-grid">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    <i className="bx bxs-lock-open me-2"></i>
                    {loading ? 'Connexion...' : 'Se connecter'}
                    <span
                      id="loginSpinner"
                      className={`spinner-border spinner-border-sm ms-2 ${loading ? '' : 'd-none'}`}
                      role="status"
                    ></span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="mobile-carousel">
            <div
              className="mobile-carousel-item"
              id="mobileCarouselItem"
              style={{ backgroundImage: `url('${currentImage.url}')` }}
            >
              <div className="mobile-carousel-caption">
                <h6 className="mb-0">{currentImage.title}</h6>
              </div>
            </div>
            <div className="mobile-carousel-controls">
              <button className="mobile-carousel-btn" type="button" onClick={prevImage}>
                <i className="bx bx-chevron-left"></i>
              </button>
              <span id="mobileImageCounter" className="align-self-center">
                {currentImageIndex + 1}/{backgroundImages.length}
              </span>
              <button className="mobile-carousel-btn" type="button" onClick={nextImage}>
                <i className="bx bx-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div 
        className="right-half" 
        id="backgroundImage"
        style={{ backgroundImage: `url('${currentImage.url}')` }}
      >
        <div className="overlay"></div>
        <div className="carousel-controls">
          <button className="carousel-btn" type="button" onClick={prevImage}>
            <i className="bx bx-chevron-left"></i>
          </button>
          <button className="carousel-btn" type="button" onClick={nextImage}>
            <i className="bx bx-chevron-right"></i>
          </button>
        </div>
        <div className="image-counter" id="imageCounter">
          Image {currentImageIndex + 1}/{backgroundImages.length}
        </div>
      </div>
    </div>
  );
};

export default Login;
