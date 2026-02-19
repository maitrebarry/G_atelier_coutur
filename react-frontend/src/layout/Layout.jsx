import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fetchCurrentSubscription } from '../api/subscription';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [subscriptionWarning, setSubscriptionWarning] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleToggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;

    const checkSubscription = async () => {
      try {
        const current = await fetchCurrentSubscription();
        if (!mounted) return;
        setSubscriptionWarning(current || null);

        if (current?.blocked || current?.shouldShowModal) {
          try {
            window.dispatchEvent(new Event('subscription-notification-updated'));
          } catch (e) {
            // ignore
          }
        }

        const modalKey = `sub-modal-${current?.atelierId || 'none'}-${current?.dateFin || 'none'}-${current?.blocked ? 'blocked' : 'warn'}`;
        const alreadyShown = sessionStorage.getItem('__SUB_MODAL_KEY__') === modalKey;

        if (current?.blocked && location.pathname !== '/abonnement') {
          if (!alreadyShown) {
            sessionStorage.setItem('__SUB_MODAL_KEY__', modalKey);
            const r = await Swal.fire({
              icon: 'warning',
              title: 'Abonnement expiré',
              text: current?.message || 'Votre abonnement est expiré. Veuillez renouveler pour continuer.',
              confirmButtonText: 'Gérer l’abonnement',
              allowOutsideClick: false,
              allowEscapeKey: false,
            });
            if (r.isConfirmed && mounted && location.pathname !== '/abonnement') {
              navigate('/abonnement');
            }
          } else {
            navigate('/abonnement');
          }
          return;
        }

        if (current?.shouldShowModal && !alreadyShown) {
          sessionStorage.setItem('__SUB_MODAL_KEY__', modalKey);
          const r = await Swal.fire({
            icon: 'warning',
            title: 'Abonnement bientôt expiré',
            text: current?.message || `Votre abonnement arrive à échéance dans ${current?.daysRemaining ?? '?'} jour(s).`,
            confirmButtonText: 'Gérer l’abonnement',
            showCancelButton: true,
            cancelButtonText: 'Plus tard',
          });
          if (r.isConfirmed && mounted) {
            navigate('/abonnement');
          }
        }
      } catch (e) {
        // ignore
      }
    };

    checkSubscription();
  }, [location.pathname, navigate]);

  return (
    <div className={`wrapper ${isSidebarOpen ? 'toggled' : ''}`}>
      <Sidebar onToggleSidebar={handleToggleSidebar} />
      <Header onToggleSidebar={handleToggleSidebar} />
      <div className="sidebar-overlay" onClick={handleCloseSidebar}></div>
      <div className="page-wrapper">
        <div className="page-content">
          {subscriptionWarning?.message && (
            <div className={`alert ${subscriptionWarning?.blocked ? 'alert-danger' : 'alert-warning'} d-flex justify-content-between align-items-center`} role="alert">
              <div>
                <strong>{subscriptionWarning?.blocked ? 'Abonnement expiré.' : 'Alerte abonnement.'}</strong> {subscriptionWarning.message}
              </div>
              <button className="btn btn-sm btn-outline-dark" onClick={() => navigate('/abonnement')}>
                Gérer l'abonnement
              </button>
            </div>
          )}
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;