import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, Alert, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/backend';

export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false); // dropdown under avatar
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [atelierSubscriptions, setAtelierSubscriptions] = useState([]);
  const [subscriptionPayments, setSubscriptionPayments] = useState([]);
  const [planSelectionByAtelier, setPlanSelectionByAtelier] = useState({});
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [loadingSubscriptionPayments, setLoadingSubscriptionPayments] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('PENDING');
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [dateEditAtelierId, setDateEditAtelierId] = useState(null);
  const [dateForm, setDateForm] = useState({ dateDebut: '', dateFin: '' });

  useEffect(() => {
    (async () => {
      try {
        const d = await AsyncStorage.getItem('userData');
        if (d) {
        const parsed = JSON.parse(d);
        console.log('loaded userData', parsed);
        setUserData(parsed);
      }
      } catch (e) {}
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        try {
          const token = await AsyncStorage.getItem('authToken');
          if (active && !token) {
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            return;
          }

          if (active) {
            const res = await api.get('/dashboard');
            setDashboardData(res.data || null);
          }
        } catch (e) {
          console.log('Erreur dashboard mobile:', e?.response?.data || e?.message || e);
        }
      })();
      return () => {
        active = false;
      };
    }, [navigation])
  );

  const loadSubscriptionPlans = async () => {
    try {
      const res = await api.get('/admin/subscriptions/plans');
      setSubscriptionPlans(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSubscriptionPlans([]);
    }
  };

  const loadAtelierSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);
      const res = await api.get('/admin/subscriptions/ateliers');
      const data = Array.isArray(res.data) ? res.data : [];
      setAtelierSubscriptions(data);
      setPlanSelectionByAtelier((prev) => {
        const next = { ...prev };
        data.forEach((row) => {
          const id = row.atelier_id || row.atelierId;
          if (!id) return;
          if (!next[id]) {
            next[id] = row.plan_code || row.planCode || 'MENSUEL';
          }
        });
        return next;
      });
    } catch {
      setAtelierSubscriptions([]);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const loadSubscriptionPayments = async () => {
    try {
      setLoadingSubscriptionPayments(true);
      const status = paymentStatusFilter || '';
      const res = await api.get(`/admin/subscriptions/payments${status ? `?status=${encodeURIComponent(status)}` : ''}`);
      setSubscriptionPayments(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSubscriptionPayments([]);
    } finally {
      setLoadingSubscriptionPayments(false);
    }
  };

  useEffect(() => {
    if (role !== 'SUPERADMIN') return;
    loadSubscriptionPlans();
    loadAtelierSubscriptions();
    loadSubscriptionPayments();
  }, [role, paymentStatusFilter]);

  const role = (userData?.role || '').toUpperCase();
  const userPermissions = Array.isArray(userData?.permissions)
    ? userData.permissions.map((p) => (typeof p === 'string' ? p : p?.code)).filter(Boolean)
    : [];

  const hasPermission = (permissionCode) => {
    if (!permissionCode) return true;
    if (['SUPERADMIN', 'PROPRIETAIRE'].includes(role)) return true;
    return userPermissions.includes(permissionCode);
  };

  const canViewClients = hasPermission('CLIENT_VOIR');
  const canViewAlbums = hasPermission('MODELE_VOIR');
  const canViewAffectations = hasPermission('AFFECTATION_VOIR');
  const canViewRendezVous = hasPermission('RENDEZ_VOUS_VOIR');
  const canViewPaiements = hasPermission('PAIEMENT_VOIR');
  const canCreateClient = hasPermission('CLIENT_CREER') || canViewClients;

  const formatCurrency = (amount) => {
    const n = Number(amount || 0);
    try {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(n);
    } catch (e) {
      return `${n} XOF`;
    }
  };

  const formatRdv = (rdv) => {
    if (!rdv) return '—';
    try {
      const d = new Date(rdv.date);
      const when = Number.isNaN(d.getTime()) ? String(rdv.date || '') : d.toLocaleString('fr-FR');
      return `${rdv.clientNom || 'Client'} • ${when}`;
    } catch (e) {
      return '—';
    }
  };

  const dashboardCards =
    role === 'TAILLEUR'
      ? [
          {
            title: 'Affectations en attente',
            value: dashboardData?.affectationsEnAttente ?? '0',
            icon: '⏳',
            color: '#fd7e14',
            screen: null,
          },
          {
            title: 'Affectations en cours',
            value: dashboardData?.affectationsEnCours ?? '0',
            icon: '🧵',
            color: '#0d6efd',
            screen: null,
          },
          {
            title: 'Terminées (7j)',
            value: dashboardData?.affectationsTermineesSemaine ?? '0',
            icon: '✅',
            color: '#f59f00',
            screen: null,
          },
          {
            title: 'Revenus mensuels',
            value: formatCurrency(dashboardData?.revenusMensuels || 0),
            icon: '💰',
            color: '#20c997',
            screen: null,
          },
        ]
      : role === 'SECRETAIRE'
      ? [
          {
            title: 'Nouveaux clients (7j)',
            value: dashboardData?.nouveauxClientsSemaine ?? '0',
            icon: '👥',
            color: '#20c997',
            screen: 'Clients',
          },
          {
            title: "Rendez-vous d'aujourd'hui",
            value: dashboardData?.rendezVousAujourdhui ?? '0',
            icon: '📅',
            color: '#0d6efd',
            screen: 'Rendezvous',
          },
          {
            title: 'Affectations en attente',
            value: dashboardData?.affectationsEnAttente ?? '0',
            icon: '📌',
            color: '#fd7e14',
            screen: null,
          },
          {
            title: 'Paiements en attente',
            value: dashboardData?.paiementsAttente ?? '0',
            icon: '💳',
            color: '#0dcaf0',
            screen: 'Paiements',
          },
        ]
      : role === 'SUPERADMIN'
      ? [
          {
            title: 'Total ateliers',
            value: dashboardData?.totalAteliers ?? '0',
            icon: '🏭',
            color: '#20c997',
            screen: null,
          },
          {
            title: 'Total clients',
            value: dashboardData?.totalClients ?? '0',
            icon: '👥',
            color: '#0d6efd',
            screen: null,
          },
          {
            title: "Chiffre d'affaires",
            value: formatCurrency(dashboardData?.chiffreAffairesTotal || 0),
            icon: '💰',
            color: '#fd7e14',
            screen: null,
          },
        ]
      : [
          {
            title: "Chiffre d'affaires mensuel",
            value: formatCurrency(dashboardData?.chiffreAffairesMensuel || 0),
            icon: '💰',
            color: '#20c997',
            screen: null,
          },
          {
            title: 'Prochain RDV',
            value: formatRdv(dashboardData?.rendezVousProchains?.[0]),
            icon: '📅',
            color: '#0d6efd',
            screen: 'Rendezvous',
          },
          {
            title: 'Nombre de tailleurs',
            value: dashboardData?.totalTailleurs ?? '0',
            icon: '✂️',
            color: '#fd7e14',
            screen: null,
          },
        ];

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Oui',
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              'authToken',
              'userData',
              'authRemember',
              'smb_sub_blocked',
            ]);
          } catch (e) {
            // ignore storage error but still force logout navigation
          } finally {
            setShowProfileMenu(false);
            setSidebarVisible(false);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        },
      }
    ]);
  };

  // simplified card component used elsewhere
  const MenuCard = ({ title, value, color = '#0d6efd', icon, onPress }) => (
    <TouchableOpacity
      style={[styles.menuCard, { backgroundColor: color || '#fff' }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {icon && <Text style={styles.cardIcon}>{icon}</Text>}
      <Text style={[styles.cardTitle, { color: color ? '#fff' : '#333' }]}>{title}</Text>
      <Text style={[styles.cardValue, { color: color ? '#fff' : '#333' }]}>{value}</Text>
    </TouchableOpacity>
  );

  // button style used for dashboard items (similar to JAKO-DANAYA)
  const DashboardButton = ({ title, value, icon, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: '#eee',
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
        },
      ]}
    >
      {icon && (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#f1f1f1',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '900', fontSize: 16 }}>{title}</Text>
        {value !== undefined && <Text style={{ color: '#666', marginTop: 4 }}>{value}</Text>}
      </View>
      <Text style={{ fontSize: 18, color: '#aaa' }}>›</Text>
    </TouchableOpacity>
  );

  const roleDetailSections = () => {
    if (role === 'TAILLEUR') {
      return (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Affectations en cours</Text>
            <View style={styles.panelCard}>
              {dashboardData?.affectationsEnCoursList?.length > 0 ? (
                dashboardData.affectationsEnCoursList.map((aff, index) => (
                  <View key={`aff-${index}`} style={styles.panelRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.panelMain}>{aff.clientNom || 'Client'}</Text>
                      <Text style={styles.panelSub}>{aff.typeVetement || 'Modèle'}</Text>
                    </View>
                    <Text style={styles.panelSub}>{aff.statut || 'EN_COURS'}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Aucune affectation en cours</Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prochaines échéances</Text>
            <View style={styles.panelCard}>
              {dashboardData?.prochainesEcheances?.length > 0 ? (
                dashboardData.prochainesEcheances.map((echeance, index) => (
                  <View key={`ech-${index}`} style={styles.panelRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.panelMain}>{echeance.clientNom || 'Client'}</Text>
                      <Text style={styles.panelSub}>{echeance.typeVetement || 'Modèle'}</Text>
                    </View>
                    <Text style={styles.panelSub}>{echeance.joursRestants ?? 0} jour(s)</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Aucune échéance prochaine</Text>
              )}
            </View>
          </View>
        </>
      );
    }

    if (role === 'SECRETAIRE') {
      return (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rendez-vous aujourd'hui</Text>
            <View style={styles.panelCard}>
              {dashboardData?.rendezVousAujourdhuiList?.length > 0 ? (
                dashboardData.rendezVousAujourdhuiList.map((rdv, index) => (
                  <View key={`rdv-${index}`} style={styles.panelRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.panelMain}>{rdv.clientNom || 'Client'}</Text>
                      <Text style={styles.panelSub}>{rdv.type || 'RDV'}</Text>
                    </View>
                    <Text style={styles.panelSub}>{rdv.statut || 'PLANIFIE'}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Aucun rendez-vous aujourd'hui</Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clients récents</Text>
            <View style={styles.panelCard}>
              {dashboardData?.clientsRecents?.length > 0 ? (
                dashboardData.clientsRecents.map((client, index) => (
                  <View key={`cli-${index}`} style={styles.panelRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.panelMain}>{client.nomComplet || 'Client'}</Text>
                      <Text style={styles.panelSub}>{client.contact || 'Non renseigné'}</Text>
                    </View>
                    <Text style={styles.panelSub}>{client.totalCommandes ?? 0} cmd</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Aucun client récent</Text>
              )}
            </View>
          </View>
        </>
      );
    }

    if (role === 'SUPERADMIN') {
      return (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gestion des abonnements</Text>
            <View style={styles.panelCard}>
              {loadingSubscriptions ? (
                <Text style={styles.emptyText}>Chargement...</Text>
              ) : atelierSubscriptions.length > 0 ? (
                atelierSubscriptions.map((row, index) => (
                  <View key={`sub-${row.atelier_id || index}`} style={styles.subscriptionRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.panelMain}>{row.atelier_nom || row.atelierNom || 'Atelier'}</Text>
                      <Text style={styles.panelSub}>Plan: {row.plan_libelle || row.plan_code || row.planCode || 'N/A'}</Text>
                      <Text style={styles.panelSub}>Échéance: {row.date_fin ? new Date(row.date_fin).toLocaleDateString('fr-FR') : '—'}</Text>
                    </View>
                    <View style={styles.subscriptionActions}>
                      <View style={styles.planOptions}>
                        {subscriptionPlans.map((p) => (
                          <TouchableOpacity
                            key={`${row.atelier_id || index}-${p.code}`}
                            style={[styles.planChip, (planSelectionByAtelier[row.atelier_id || row.atelierId] || 'MENSUEL') === p.code && styles.planChipActive]}
                            onPress={() => setPlanSelectionByAtelier((prev) => ({
                              ...prev,
                              [row.atelier_id || row.atelierId]: p.code,
                            }))}
                          >
                            <Text style={[styles.planChipText, (planSelectionByAtelier[row.atelier_id || row.atelierId] || 'MENSUEL') === p.code && styles.planChipTextActive]}>
                              {p.code}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={async () => {
                            const atelierId = row.atelier_id || row.atelierId;
                            const planCode = planSelectionByAtelier[atelierId] || row.plan_code || 'MENSUEL';
                            try {
                              await api.post(`/admin/subscriptions/ateliers/${atelierId}/activate`, { planCode });
                              loadAtelierSubscriptions();
                            } catch (e) {
                              Alert.alert('Erreur', e?.response?.data?.message || 'Activation impossible');
                            }
                          }}
                        >
                          <Text style={styles.actionBtnText}>Activer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionBtnDanger}
                          onPress={async () => {
                            const atelierId = row.atelier_id || row.atelierId;
                            try {
                              await api.post(`/admin/subscriptions/ateliers/${atelierId}/suspend`);
                              loadAtelierSubscriptions();
                            } catch (e) {
                              Alert.alert('Erreur', e?.response?.data?.message || 'Suspension impossible');
                            }
                          }}
                        >
                          <Text style={styles.actionBtnDangerText}>Suspendre</Text>
                        </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionBtnNeutral}
                            onPress={() => {
                              const atelierId = row.atelier_id || row.atelierId;
                              const start = row.date_debut ? new Date(row.date_debut).toISOString().slice(0, 10) : '';
                              const end = row.date_fin ? new Date(row.date_fin).toISOString().slice(0, 10) : '';
                              setDateEditAtelierId(atelierId);
                              setDateForm({ dateDebut: start, dateFin: end });
                              setDateModalVisible(true);
                            }}
                          >
                            <Text style={styles.actionBtnNeutralText}>Dates</Text>
                          </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Aucune donnée abonnement</Text>
              )}
            </View>
          </View>

            <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paiements abonnement (manuel)</Text>
            <View style={styles.panelCard}>
              <View style={styles.filterRow}>
                {[
                  { key: 'PENDING', label: 'En attente' },
                  { key: 'PAID', label: 'Payé' },
                  { key: 'FAILED', label: 'Échec' },
                  { key: 'ALL', label: 'Tous' },
                ].map((s) => {
                  const active = s.key === 'ALL' ? paymentStatusFilter === '' : paymentStatusFilter === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setPaymentStatusFilter(s.key === 'ALL' ? '' : s.key)}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{s.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {loadingSubscriptionPayments ? (
                <Text style={styles.emptyText}>Chargement...</Text>
              ) : subscriptionPayments.length > 0 ? (
                subscriptionPayments.map((pay, index) => (
                  <View key={`pay-${pay.id || index}`} style={styles.panelRow}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.panelMain}>{pay.atelierNom || pay.atelier_nom || 'Atelier'}</Text>
                      <Text style={styles.panelSub}>Plan: {pay.planCode || pay.plan_code || 'N/A'}</Text>
                      <Text style={styles.panelSub}>Montant: {pay.montant || pay.amount || '0'} {pay.devise || 'XOF'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={async () => {
                          try {
                            await api.post(`/admin/subscriptions/payments/${pay.id}/approve`);
                            loadSubscriptionPayments();
                          } catch (e) {
                            Alert.alert('Erreur', e?.response?.data?.message || 'Approbation impossible');
                          }
                        }}
                      >
                        <Text style={styles.actionBtnText}>Approuver</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtnDanger}
                        onPress={async () => {
                          try {
                            await api.post(`/admin/subscriptions/payments/${pay.id}/reject`, { reason: '' });
                            loadSubscriptionPayments();
                          } catch (e) {
                            Alert.alert('Erreur', e?.response?.data?.message || 'Rejet impossible');
                          }
                        }}
                      >
                        <Text style={styles.actionBtnDangerText}>Rejeter</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Aucun paiement en attente</Text>
              )}
            </View>
          </View>
        </>
      );
    }

    return null;
  };

  // Mobile currently exposes only implemented screens, filtered by permissions.
  const bottomBarModules = [
    { label: 'Accueil', icon: '🏠', screen: 'Home', visible: true },
    { label: 'Clients', icon: '👥', screen: 'Clients', visible: canViewClients },
    { label: 'Albums', icon: '🖼️', screen: 'Albums', visible: canViewAlbums },
    { label: 'Affectation', icon: '📋', screen: 'Affectation', visible: canViewAffectations },
    { label: 'Paiements', icon: '💳', screen: 'Paiements', visible: canViewPaiements },
  ].filter((m) => m.visible);

  const sidebarModules = [
    { label: 'Atelier', icon: '🏭', screen: 'Atelier', visible: true },
    { label: 'Utilisateur', icon: '👤', screen: 'Utilisateurs', visible: true },
    { label: 'Assigner Permission', icon: '🛡️', screen: 'AssignerPermission', visible: true },
    { label: 'Liste Permission', icon: '📜', screen: 'ListePermission', visible: role === 'SUPERADMIN' },
    { label: 'Documentation', icon: '📖', screen: 'Documentation', visible: true },
  ].filter((m) => m.visible);

  const goToModule = (screen) => {
    const implementedScreens = new Set([
      'Home',
      'Clients',
      'Albums',
      'Affectation',
      'Rendezvous',
      'Paiements',
      'Profile',
      'MesureAdd',
      'Abonnement',
      'Atelier',
      'Utilisateurs',
      'AssignerPermission',
      'ListePermission',
      'Documentation',
    ]);
    if (implementedScreens.has(screen)) {
      navigation.navigate(screen);
      return;
    }
    Alert.alert('Information', `Le module "${screen}" sera activé dans la prochaine étape.`);
  };

  // Header layout
  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>             
          <TouchableOpacity style={styles.menuButton} onPress={() => setSidebarVisible(true)}>
            <Text style={{ fontSize: 24 }}>☰</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'column' }}>
            <Text style={styles.atelierName}>{userData?.atelier || 'Mon atelier'}</Text>
            <View style={styles.helloRow}>
              <Text style={styles.hello}>Bonjour, {userData?.prenom || 'Utilisateur'}</Text>
              <Text style={styles.wave}>👋</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerCenter}>{/* empty, greeting moved left */}</View>
        <View style={styles.headerRight}>
          {/* Notification icon first */}
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notifButton}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </TouchableOpacity>
          {/* Profil photo -> toggle menu; show placeholder if missing */}
          <TouchableOpacity onPress={() => setShowProfileMenu(!showProfileMenu)}>
            {userData?.photo ? (
              <Image source={{ uri: userData.photo }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <Text style={{ fontSize: 18 }}>👤</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {showProfileMenu && (
        <View style={styles.profileMenu}>
          {userData?.atelier ? (
            <View style={styles.profileMenuItem}>
              <Text style={[styles.profileMenuText, { fontWeight: '900' }]}>{userData.atelier}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.profileMenuItem}
            onPress={() => {
              setShowProfileMenu(false);
              navigation.navigate('Profile');
            }}
          >
            <Text style={styles.profileMenuText}>Profil</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileMenuItem}
            onPress={() => {
              setShowProfileMenu(false);
              handleLogout();
            }}
          >
            <Text style={[styles.profileMenuText, { color: '#dc3545' }]}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sidebar */}
      <Modal visible={sidebarVisible} animationType="slide" transparent>
        <View style={styles.sidebarOverlay}>
          <View style={styles.sidebar}>
            {/* Icon pour fermer (croix) */}
            <TouchableOpacity style={styles.sidebarCloseIcon} onPress={() => setSidebarVisible(false)}>
              <Text style={{ fontSize: 22, color: '#dc3545' }}>✖️</Text>
            </TouchableOpacity>
            {/* Atelier connecté */}
            {userData?.atelier ? (
              <Text style={styles.sidebarAtelier}>{userData.atelier}</Text>
            ) : null}
            <Text style={styles.sidebarTitle}>Modules</Text>
            {sidebarModules.map((item) => (
              <TouchableOpacity key={item.label} style={styles.sidebarItem} onPress={() => { setSidebarVisible(false); goToModule(item.screen); }}>
                <Text style={styles.sidebarIcon}>{item.icon}</Text>
                <Text style={styles.sidebarLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            {/* Profil */}
            <TouchableOpacity style={styles.sidebarItem} onPress={() => { setSidebarVisible(false); navigation.navigate('Profile'); }}>
              <Text style={styles.sidebarIcon}>👤</Text>
              <Text style={styles.sidebarLabel}>Profil</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* Body */}
      <ScrollView contentContainerStyle={styles.container}>
        {/* Section Dashboard Atelier (3 cards, disposition moderne) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tableau de bord</Text>
          <View style={{marginBottom: 12}}>
            {dashboardCards.map((card, idx) => (
              <DashboardButton
                key={`${card.title}-${idx}`}
                title={card.title}
                value={card.value}
                icon={card.icon}
                onPress={card.screen ? () => navigation.navigate(card.screen) : undefined}
              />
            ))}
          </View>
        </View>

        {roleDetailSections()}

        {/* Actions rapides (1 bouton) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.row}>
            {canCreateClient ? (
              <MenuCard title="Nouveau client" value="" color="#0d6efd" icon="🧵" onPress={() => navigation.navigate('MesureAdd')} />
            ) : null}
            {canViewRendezVous ? (
              <MenuCard title="Rendez-vous" value="" color="#0d6efd" icon="📅" onPress={() => navigation.navigate('Rendezvous')} />
            ) : null}
          </View>
        </View>

      </ScrollView>

      {/* Dates modal */}
      <Modal visible={dateModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Modifier les dates</Text>
            <Text style={styles.modalLabel}>Date début (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              value={dateForm.dateDebut}
              onChangeText={(v) => setDateForm((prev) => ({ ...prev, dateDebut: v }))}
            />
            <Text style={styles.modalLabel}>Date fin (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              value={dateForm.dateFin}
              onChangeText={(v) => setDateForm((prev) => ({ ...prev, dateFin: v }))}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setDateModalVisible(false);
                  setDateEditAtelierId(null);
                }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={async () => {
                  if (!dateEditAtelierId || !dateForm.dateDebut || !dateForm.dateFin) {
                    Alert.alert('Erreur', 'Veuillez saisir les deux dates');
                    return;
                  }
                  try {
                    await api.put(`/admin/subscriptions/ateliers/${dateEditAtelierId}/dates`, {
                      dateDebut: `${dateForm.dateDebut}T00:00:00`,
                      dateFin: `${dateForm.dateFin}T00:00:00`,
                    });
                    setDateModalVisible(false);
                    setDateEditAtelierId(null);
                    loadAtelierSubscriptions();
                  } catch (e) {
                    Alert.alert('Erreur', e?.response?.data?.message || 'Mise à jour impossible');
                  }
                }}
              >
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer (bottom bar) */}
      <View style={styles.bottomBar}>
        {bottomBarModules.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.bottomItem}
            onPress={() => goToModule(item.screen)}
          >
            <Text style={styles.bottomIcon}>{item.icon}</Text>
            <Text style={styles.bottomLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 36, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', marginTop: 10 },
  menuButton: { padding: 8, borderRadius: 24, backgroundColor: '#f1f1f1', marginRight: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'flex-start', marginLeft: 8 },
  atelierName: { fontSize: 16, fontWeight: 'bold', color: '#0d6efd' },
  helloRow: { flexDirection: 'row', alignItems: 'center' },
  hello: { fontSize: 15, color: '#333' },
  wave: { fontSize: 18, marginLeft: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  profilePhoto: { width: 40, height: 40, borderRadius: 20, marginLeft: 8, backgroundColor: '#eee' },
  profilePhotoPlaceholder: { width: 40, height: 40, borderRadius: 20, marginLeft: 8, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  notifButton: { marginLeft: 8 },
  container: { padding: 18 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  panelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    paddingVertical: 8,
  },
  panelMain: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  panelSub: { fontSize: 12, color: '#6b7280' },
  emptyText: { fontSize: 13, color: '#6b7280' },
  subscriptionRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    paddingVertical: 10,
  },
  subscriptionActions: { marginTop: 8 },
  planOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  planChip: {
    borderWidth: 1,
    borderColor: '#ccd6eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planChipActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  planChipText: { fontSize: 11, fontWeight: '700', color: '#344563' },
  planChipTextActive: { color: '#fff' },
  actionBtn: {
    borderWidth: 1,
    borderColor: '#0d6efd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: { color: '#0d6efd', fontWeight: '700', fontSize: 12 },
  actionBtnDanger: {
    borderWidth: 1,
    borderColor: '#dc3545',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnDangerText: { color: '#dc3545', fontWeight: '700', fontSize: 12 },
  actionBtnNeutral: {
    borderWidth: 1,
    borderColor: '#6c757d',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnNeutralText: { color: '#6c757d', fontWeight: '700', fontSize: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  filterChip: { borderWidth: 1, borderColor: '#ccd6eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  filterChipActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  filterChipText: { color: '#344563', fontWeight: '700', fontSize: 12 },
  filterChipTextActive: { color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 12, color: '#1b2a4a' },
  modalLabel: { fontWeight: '700', color: '#1b2a4a', marginBottom: 6 },
  modalInput: {
    backgroundColor: '#f8f9fc',
    borderWidth: 1,
    borderColor: '#e5eaf3',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancel: { borderWidth: 1, borderColor: '#6c757d', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  modalCancelText: { color: '#6c757d', fontWeight: '700' },
  modalSave: { backgroundColor: '#0d6efd', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  modalSaveText: { color: '#fff', fontWeight: '800' },
  menuCard: { flex: 1, marginHorizontal: 4, borderRadius: 16, padding: 16, alignItems: 'center', elevation: 2 },
  cardIcon: { fontSize: 32, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  cardValue: { fontSize: 16, fontWeight: 'bold' },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 8,
  },
  bottomItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottomIcon: { fontSize: 18 },
  bottomLabel: { fontSize: 11, marginTop: 2, color: '#444' },
  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-start' },
  sidebar: { width: 260, backgroundColor: '#fff', padding: 24, paddingTop: 120, borderTopRightRadius: 24, borderBottomRightRadius: 24, elevation: 6, height: '100%' },
  sidebarAtelier: { fontSize: 18, fontWeight: '700', marginBottom: 6, color: '#0d6efd' },
  sidebarTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 18, color: '#222' },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  sidebarIcon: { fontSize: 22, marginRight: 12 },
  sidebarLabel: { fontSize: 15, color: '#333' },
  sidebarSectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#0d6efd', marginTop: 32, marginBottom: 8 },
  sidebarCloseIcon: { position: 'absolute', top: 120, right: 12, zIndex: 10 },
  sidebarFooterSection: { marginTop: 32, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  profileMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    paddingVertical: 4,
  },
  profileMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  profileMenuText: {
    fontSize: 16,
    color: '#333',
  },
});
