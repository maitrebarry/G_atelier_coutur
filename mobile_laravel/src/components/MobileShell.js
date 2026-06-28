import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/backend';

const BOTTOM_MODULES = [
  { label: 'Accueil', icon: 'home-outline', screen: 'Home' },
  { label: 'Clients', icon: 'people-outline', screen: 'Clients' },
  { label: 'Affectations', icon: 'person-done-outline', screen: 'Affectation' },
  { label: 'Rendez-vous', icon: 'calendar-outline', screen: 'Rendezvous' },
  { label: 'Paiements', icon: 'card-outline', screen: 'Paiements' },
];

const SIDE_MODULES = [
  { label: 'Tableau de bord', icon: 'home-outline', screen: 'Home' },
  { label: 'Clients', icon: 'people-outline', screen: 'Clients' },
  { label: 'Nouveau client', icon: 'person-add-outline', screen: 'MesureAdd' },
  { label: 'Albums / modèles', icon: 'image-outline', screen: 'Albums' },
  { label: 'Affectations', icon: 'checkmark-done-outline', screen: 'Affectation' },
  { label: 'Rendez-vous', icon: 'calendar-outline', screen: 'Rendezvous' },
  { label: 'Paiements', icon: 'card-outline', screen: 'Paiements' },
];

const SIDE_ADMIN_MODULES = [
  { label: 'Utilisateurs', icon: 'people-circle-outline', screen: 'Utilisateurs' },
  { label: 'Permissions', icon: 'shield-checkmark-outline', screen: 'AssignerPermission' },
  { label: 'Atelier', icon: 'business-outline', screen: 'Atelier' },
  { label: 'Abonnement', icon: 'ribbon-outline', screen: 'Abonnement' },
  { label: 'Documentation', icon: 'book-outline', screen: 'Documentation' },
];

export function AppHeader({ navigation, title, subtitle, showBack = false }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userData, setUserData] = useState(null);
  const [atelierId, setAtelierId] = useState(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem('userData').then((raw) => {
      if (!mounted || !raw) return;
      try { setUserData(JSON.parse(raw)); } catch (e) {}
    });
    AsyncStorage.getItem('atelierId').then((id) => {
      if (mounted) setAtelierId(id);
    });
    return () => { mounted = false; };
  }, []);

  const role = (userData?.role || '').toUpperCase();
  const isSuperAdmin = role === 'SUPERADMIN';
  const isProprietaire = ['PROPRIETAIRE', 'SUPERADMIN'].includes(role);
  const atelierName = userData?.atelier || 'Ateliko';
  const displayTitle = title || atelierName;

  const apiBase = (api?.defaults?.baseURL || '').replace(/\/?api\/?$/i, '');
  const photoUri = userData?.photo
    ? (String(userData.photo).startsWith('http') ? userData.photo : `${apiBase}/storage/${userData.photo}`)
    : null;

  const goTo = (screen) => {
    setSidebarVisible(false);
    navigation.navigate(screen);
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showBack ? (
            <TouchableOpacity style={styles.roundButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#1f2937" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.roundButton} onPress={() => setSidebarVisible(true)}>
              <Ionicons name="menu" size={22} color="#1f2937" />
            </TouchableOpacity>
          )}
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>{displayTitle}</Text>
            {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.roundButton} onPress={() => navigation.navigate('Profile')}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.profileImage} />
            ) : (
              <Ionicons name="person-circle-outline" size={28} color="#475569" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={sidebarVisible} animationType="slide" transparent onRequestClose={() => setSidebarVisible(false)}>
        <Pressable style={styles.sidebarOverlay} onPress={() => setSidebarVisible(false)}>
          <Pressable style={styles.sidebar}>
            <TouchableOpacity style={styles.sidebarClose} onPress={() => setSidebarVisible(false)}>
              <Ionicons name="close-outline" size={26} color="#334155" />
            </TouchableOpacity>

            <Text style={styles.sidebarAtelier} numberOfLines={1}>{atelierName}</Text>
            <Text style={styles.sidebarSectionLabel}>Modules</Text>

            {SIDE_MODULES.map((item) => (
              <TouchableOpacity key={item.label} style={styles.sidebarItem} onPress={() => goTo(item.screen)}>
                <Ionicons name={item.icon} size={20} color="#0d6efd" style={styles.sidebarIcon} />
                <Text style={styles.sidebarLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}

            {isProprietaire && (
              <>
                <View style={styles.sidebarDivider} />
                <Text style={styles.sidebarSectionLabel}>Administration</Text>
                {SIDE_ADMIN_MODULES.filter((m) => {
                  if (m.screen === 'AssignerPermission' && !isSuperAdmin && role !== 'PROPRIETAIRE') return false;
                  return true;
                }).map((item) => (
                  <TouchableOpacity key={item.label} style={styles.sidebarItem} onPress={() => goTo(item.screen)}>
                    <Ionicons name={item.icon} size={20} color="#6366f1" style={styles.sidebarIcon} />
                    <Text style={styles.sidebarLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={styles.sidebarDivider} />
            <TouchableOpacity style={styles.sidebarItem} onPress={() => goTo('Profile')}>
              <Ionicons name="person-outline" size={20} color="#64748b" style={styles.sidebarIcon} />
              <Text style={styles.sidebarLabel}>Mon profil</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function BottomBar({ navigation, active }) {
  return (
    <View style={styles.bottomBar}>
      {BOTTOM_MODULES.map((item) => {
        const isActive = active === item.screen;
        return (
          <TouchableOpacity key={item.label} style={styles.bottomItem} onPress={() => navigation.navigate(item.screen)}>
            <Ionicons name={item.icon} size={22} color={isActive ? '#0d6efd' : '#64748b'} />
            <Text style={[styles.bottomLabel, isActive && styles.bottomLabelActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function StatusChip({ label, color = '#0d6efd', backgroundColor = '#e8f1ff' }) {
  return (
    <View style={[styles.statusChip, { borderColor: color, backgroundColor }]}>
      <Text style={[styles.statusChipText, { color }]}>{label || '—'}</Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4f6fb' },
  content: { padding: 16, paddingBottom: 112 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#152238', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eef2f8',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '900', color: '#152238' },
  name: { fontSize: 16, fontWeight: '900', color: '#1f2937' },
  text: { fontSize: 14, color: '#334155' },
  muted: { fontSize: 12, color: '#62748c' },
  empty: { textAlign: 'center', color: '#62748c', marginTop: 36, fontSize: 14 },
  search: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    color: '#0f172a',
    fontSize: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  list: { paddingBottom: 112, gap: 12 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d6efd',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 6,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 6,
  },
  btnDangerText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0d6efd',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 20,
    gap: 6,
  },
  btnOutlineText: { color: '#0d6efd', fontWeight: '800', fontSize: 14 },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  headerSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  profileImage: { width: 42, height: 42, borderRadius: 14 },
  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.2)', justifyContent: 'flex-start' },
  sidebar: {
    width: 285,
    height: '100%',
    backgroundColor: '#ffffff',
    padding: 22,
    paddingTop: 100,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 2, height: 0 },
    elevation: 8,
  },
  sidebarClose: { position: 'absolute', top: 52, right: 16, zIndex: 2 },
  sidebarAtelier: { fontSize: 17, fontWeight: '900', marginBottom: 2, color: '#0d6efd' },
  sidebarSectionLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '800', letterSpacing: 0.6, marginBottom: 10, marginTop: 4 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingVertical: 6 },
  sidebarIcon: { marginRight: 12 },
  sidebarLabel: { fontSize: 14, color: '#334155', fontWeight: '700' },
  sidebarDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  bottomBar: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  bottomItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  bottomLabel: { fontSize: 10, marginTop: 2, color: '#64748b', fontWeight: '700' },
  bottomLabelActive: { color: '#0d6efd' },
  statusChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 3,
  },
  statusChipText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
});
