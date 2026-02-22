import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Button, Alert, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false); // dropdown under avatar

  useEffect(() => {
    (async () => {
      try {
        const d = await AsyncStorage.getItem('userData');
        if (d) setUserData(JSON.parse(d));
      } catch (e) {}
    })();
  }, []);

  // Dashboard essentials: chiffre d'affaires mensuel, prochain RDV, nombre de tailleurs
  const dashboardCards = [
    {
      title: "Chiffre d'affaires mensuel",
      value: userData?.chiffreAffairesMensuel || '—',
      icon: '💰',
      color: '#20c997',
      screen: null
    },
    {
      title: 'Prochain RDV',
      value: userData?.prochainRDV || '—',
      icon: '📅',
      color: '#0d6efd',
      screen: 'Rendezvous'
    },
    {
      title: 'Nombre de tailleurs',
      value: userData?.nombreTailleurs || '—',
      icon: '🧵',
      color: '#fd7e14',
      screen: 'Tailleurs'
    }
  ];

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Oui', onPress: async () => {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userData');
          navigation.replace('Login');
        }
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

  // bottom navigation bar; Rendez-vous moved before Affectation for better layout
  const bottomBarModules = [
    { label: 'Accueil', icon: '🏠', screen: 'Home' },
    { label: 'Clients', icon: '👥', screen: 'Clients' },
    { label: 'Albums', icon: '🖼️', screen: 'Albums' },
    { label: 'Affectation', icon: '📋', screen: 'Affectation' },
    { label: 'Paiements', icon: '💳', screen: 'Paiements' }
  ];

  // no sidebarFooterModules needed; sidebar items will be built manually if required


  // Paramètres sous-menus (adaptés à la version web)
  const parametresSubmenus = [
    { label: 'Atelier', icon: '🏭', screen: 'ParametresAtelier' },
    { label: 'Utilisateurs', icon: '👥', screen: 'ParametresUtilisateurs' },
    { label: 'Assigner permissions', icon: '🛡️', screen: 'ParametresAssignerPermissions' },
    { label: 'Liste permission', icon: '📜', screen: 'ParametresListePermissions' },
  ];

  // Header layout
  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>             
          <Text style={styles.atelierName}>{userData?.atelier || ''}</Text>
          <TouchableOpacity style={styles.menuButton} onPress={() => setSidebarVisible(true)}>
            <Text style={{ fontSize: 24 }}>☰</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <View style={styles.helloRow}>
            <Text style={styles.hello}>Bonjour, {userData?.prenom || 'Utilisateur'} </Text>
            <Text style={styles.wave}>👋</Text>
          </View>
        </View>
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
            {/* Paramètres et sous-menus en haut */}
            <Text style={styles.sidebarTitle}>Paramètres</Text>
            {parametresSubmenus.map((item) => (
              <TouchableOpacity key={item.label} style={styles.sidebarItem} onPress={() => { setSidebarVisible(false); navigation.navigate(item.screen); }}>
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
                key={card.title}
                title={card.title}
                value={card.value}
                icon={card.icon}
                onPress={card.screen ? () => navigation.navigate(card.screen) : undefined}
              />
            ))}
          </View>
        </View>

        {/* Actions rapides (1 bouton) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.row}>
            <MenuCard title="Nouvelle mesure" value="" color="#0d6efd" icon="🧵" onPress={() => navigation.navigate('MesureAdd')} />
            <MenuCard title="Rendez-vous" value="" color="#0d6efd" icon="📅" onPress={() => navigation.navigate('Rendezvous')} />
          </View>
        </View>

      </ScrollView>

      {/* Footer (bottom bar) */}
      <View style={styles.bottomBar}>
        {bottomBarModules.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.bottomItem}
            onPress={() => navigation.navigate(item.screen)}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  menuButton: { padding: 8, borderRadius: 24, backgroundColor: '#f1f1f1', marginRight: 8 },
  headerLeft: { flexDirection: 'column', alignItems: 'flex-start', marginRight: 12 },
  headerCenter: { flex: 1, alignItems: 'flex-start', marginLeft: 8 },
  atelierName: { fontSize: 16, fontWeight: 'bold', color: '#0d6efd', marginBottom: 2 },
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
  sidebar: { width: 260, backgroundColor: '#fff', padding: 24, borderTopRightRadius: 24, borderBottomRightRadius: 24, elevation: 6, height: '100%' },
  sidebarAtelier: { fontSize: 18, fontWeight: '700', marginBottom: 6, color: '#0d6efd' },
  sidebarTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 18, color: '#222' },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  sidebarIcon: { fontSize: 22, marginRight: 12 },
  sidebarLabel: { fontSize: 15, color: '#333' },
  sidebarSectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#0d6efd', marginTop: 18, marginBottom: 8 },
  sidebarCloseIcon: { position: 'absolute', top: 12, right: 12, zIndex: 10 },
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
