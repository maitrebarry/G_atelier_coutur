import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [openMenus, setOpenMenus] = useState({});
  const location = useLocation();

  const menuConfig = [
    {
      id: 'dashboard',
      title: 'Tableau de bord',
      icon: 'bx bx-home-circle',
      href: '/home',
      alwaysVisible: true
    },
    {
      id: 'clients',
      title: 'Liste des clients',
      icon: 'bx bx-user',
      href: '/clients',
      permission: 'CLIENT_VOIR'
    },
    {
      id: 'modeles',
      title: 'Modèles',
      icon: 'bx bx-cut',
      href: '/modeles',
      permission: 'MODELE_VOIR'
    },
    {
      id: 'affectations',
      title: 'Affectations',
      icon: 'bx bx-user-check',
      href: '/affectations',
      permission: 'AFFECTATION_VOIR'
    },
    {
      id: 'rendezvous',
      title: 'Rendez-vous',
      icon: 'bx bx-calendar',
      href: '/rendezvous',
      permission: 'RENDEZ_VOUS_VOIR',
      roles: ['SUPERADMIN', 'PROPRIETAIRE', 'SECRETAIRE']
    },
    {
      id: 'paiements',
      title: 'Paiements',
      icon: 'bx bx-wallet',
      href: '/paiements',
      permission: 'PAIEMENT_VOIR',
      roles: ['SUPERADMIN', 'PROPRIETAIRE', 'SECRETAIRE']
    },
    {
      id: 'parametres',
      title: 'Paramètres',
      icon: 'bx bx-cog',
      permission: 'PARAMETRE_VOIR',
      roles: ['SUPERADMIN', 'PROPRIETAIRE'],
      children: [
        {
            id: 'atelier',
            title: 'Atelier',
            href: '/parametres',
            icon: 'bx bx-home-alt',
            roles: ['SUPERADMIN', 'PROPRIETAIRE']
        },
        {
            id: 'utilisateurs',
            title: 'Utilisateurs',
            href: '/signup',
            icon: 'bx bx-user',
            roles: ['SUPERADMIN', 'PROPRIETAIRE']
        },
        {
            id: 'permissions',
            title: 'Assigner Permission',
            href: '/permissions',
            icon: 'bx bx-user-pin',
            roles: ['SUPERADMIN', 'PROPRIETAIRE']
        },
        {
            id: 'liste_permissions',
            title: 'Liste des Permissions',
            href: '/liste-permissions',
            icon: 'bx bx-list-ul',
            roles: ['SUPERADMIN', 'PROPRIETAIRE']
        }
      ]
    }
  ];

  const getToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

  const initializeSidebar = () => {
    try {
      const token = getToken();
      if (!token) return;

      const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
      if (!userData) return;

      const role = userData.role;
      // Normalize permissions
      const userPermissions = (userData.permissions || []).map(p => 
          typeof p === 'string' ? p : (p.code || p.name)
      );
      
      console.log('Sidebar: Initializing with role:', role, 'Permissions:', userPermissions);

      let filteredItems = [];

      if (role === 'SUPERADMIN') {
        // SuperAdmin sees everything
        filteredItems = menuConfig;
      } else {
        // Recursive filter function
        const filterItems = (items) => {
            return items.reduce((acc, item) => {
                // 1. Check Role
                if (item.roles && !item.roles.includes(role)) {
                    return acc;
                }

                // 2. Check Permission
                let hasPermission = true;
                
                // ✅ CORRECTION : Pour le PROPRIETAIRE, s'il a des permissions explicites, on les respecte.
                // S'il n'en a aucune (cas par défaut), on lui donne accès à tout (comportement legacy).
                const isProprietaireDefault = role === 'PROPRIETAIRE' && userPermissions.length === 0;

                if (isProprietaireDefault) {
                    hasPermission = true;
                } else if (item.permission) {
                    hasPermission = userPermissions.includes(item.permission);
                } else if (item.alwaysVisible) {
                    hasPermission = true;
                }

                // 3. Check Children
                let filteredChildren = [];
                if (item.children) {
                    filteredChildren = filterItems(item.children);
                }

                // 4. Decision
                if (hasPermission) {
                    // If item has children, but all filtered out, and it's a container (no href), skip it
                    if (item.children && filteredChildren.length === 0 && !item.href) {
                        return acc;
                    }
                    
                    const newItem = { ...item };
                    if (item.children) {
                        newItem.children = filteredChildren;
                    }
                    acc.push(newItem);
                } else {
                    // If no permission, but has visible children, include it (as container)
                    if (filteredChildren.length > 0) {
                        const newItem = { ...item, children: filteredChildren };
                        acc.push(newItem);
                    }
                }
                return acc;
            }, []);
        };
        
        filteredItems = filterItems(menuConfig);
      }

      setMenuItems(filteredItems);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la sidebar:', error);
      // Fallback: afficher seulement les éléments alwaysVisible
      setMenuItems(menuConfig.filter(item => item.alwaysVisible));
    }
  };

  useEffect(() => {
    initializeSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically open menus based on current URL
  useEffect(() => {
    setOpenMenus(prevOpenMenus => {
        const newOpenMenus = { ...prevOpenMenus };
        let hasChanges = false;
        
        menuItems.forEach(item => {
            if (item.children) {
                const isActive = item.children.some(child => location.pathname === child.href);
                if (isActive && !newOpenMenus[item.id]) {
                    newOpenMenus[item.id] = true;
                    hasChanges = true;
                }
            }
        });
        
        return hasChanges ? newOpenMenus : prevOpenMenus;
    });
  }, [location.pathname, menuItems]);


  const toggleSubmenu = (e, itemId) => {
      e.preventDefault();
      setOpenMenus(prev => ({
          ...prev,
          [itemId]: !prev[itemId]
      }));
  };

  const isItemActive = (item) => {
      if (item.href && location.pathname === item.href) return true;
      if (item.children) {
          return item.children.some(child => location.pathname === child.href);
      }
      return false;
  };

  return (
    <div className="sidebar-wrapper" data-simplebar="true">
      <div className="sidebar-header">
        <div className="branding">
          <img src="/assets/images/logo_ateliko.png" className="logo-icon" alt="logo icon" />
          <h6 className="logo-text">ATELIKO</h6>
        </div>
        <div className="toggle-icon ms-auto">
          <i className='bx bx-arrow-to-left'></i>
        </div>
      </div>
      <ul className="metismenu" id="menu">
        {menuItems.map(item => {
            const isOpen = openMenus[item.id];
            const active = isItemActive(item);
            
            return (
                <li key={item.id} className={active ? 'mm-active' : ''}>
                    {item.children ? (
                        /* eslint-disable-next-line jsx-a11y/anchor-is-valid */
                        <a href="#" className="has-arrow" onClick={(e) => toggleSubmenu(e, item.id)} aria-expanded={isOpen}>
                            <div className="parent-icon"><i className={item.icon}></i></div>
                            <div className="menu-title">{item.title}</div>
                        </a>
                    ) : (
                        <Link to={item.href}>
                            <div className="parent-icon"><i className={item.icon}></i></div>
                            <div className="menu-title">{item.title}</div>
                        </Link>
                    )}
                    
                    {item.children && (
                        <ul className={`mm-collapse ${isOpen ? 'mm-show' : ''}`}>
                            {item.children.map(child => (
                                <li key={child.id} className={location.pathname === child.href ? 'mm-active' : ''}>
                                    <Link to={child.href}>
                                        <i className="bx bx-right-arrow-alt"></i>
                                        {child.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            );
        })}
      </ul>
    </div>
  );
};

export default Sidebar;
