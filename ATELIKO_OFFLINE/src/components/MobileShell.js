import React, {useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, Image} from 'react-native';
import PhotoPicker from './PhotoPicker';
import {getUserProfile, setUserProfilePhoto} from '../services/userService';

const MODULES = [
  {label: 'Accueil', icon: '🏠', screen: 'Home'},
  {label: 'Clients', icon: '👥', screen: 'Clients'},
  {label: 'Albums', icon: '🖼️', screen: 'Modeles'},
  {label: 'Paiements', icon: '💳', screen: 'Payments'},
  {label: 'RDV', icon: '📅', screen: 'Rendezvous'},
];

const SIDE_MODULES = [
  {label: 'Clients', icon: '👥', screen: 'Clients'},
  {label: 'Nouveau client', icon: '🧵', screen: 'ClientForm'},
  {label: 'Albums / modèles', icon: '🖼️', screen: 'Modeles'},
  {label: 'Paiements', icon: '💳', screen: 'Payments'},
  {label: 'Rendez-vous', icon: '📅', screen: 'Rendezvous'},
  {label: 'Tailleurs', icon: '✂️', screen: 'Tailleurs'},
];

export function AppHeader({navigation, title = 'ATELIKO', subtitle = '', showBack = false}) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profileModal, setProfileModal] = useState(false);

  const goTo = screen => {
    setSidebarVisible(false);
    navigation.navigate(screen);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await getUserProfile();
        if (!mounted) return;
        setProfilePhoto(p.photo || null);
      } catch (e) {
        console.error('load profile photo', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showBack ? (
            <TouchableOpacity style={styles.roundButton} onPress={() => navigation.goBack()}>
              <Text style={styles.roundButtonText}>←</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.roundButton} onPress={() => setSidebarVisible(true)}>
              <Text style={styles.roundButtonText}>☰</Text>
            </TouchableOpacity>
          )}
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.profileBubble} onPress={() => setProfileModal(true)}>
          {profilePhoto ? (
            <Image source={{uri: profilePhoto}} style={styles.profileImage} />
          ) : (
            <Text style={styles.profileIcon}>👤</Text>
          )}
        </TouchableOpacity>

        <Modal visible={profileModal} animationType="slide" transparent onRequestClose={() => setProfileModal(false)}>
          <Pressable style={styles.sidebarOverlay} onPress={() => setProfileModal(false)}>
            <Pressable style={[styles.sidebar, {width: '90%', maxWidth: 420, padding: 18}]}>
              <Text style={{fontWeight:'900', fontSize:16, marginBottom:12}}>Photo du profil</Text>
              <PhotoPicker label="Photo utilisateur" value={profilePhoto} onChange={async (uri) => {
                const saved = await setUserProfilePhoto(uri);
                setProfilePhoto(saved?.photo || null);
                setProfileModal(false);
              }} prefix="user" />
              <TouchableOpacity style={{marginTop:12}} onPress={async () => { await setUserProfilePhoto(null); setProfilePhoto(null); }}>
                <Text style={{color:'#dc3545', fontWeight:'900'}}>Supprimer la photo</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>

      <Modal visible={sidebarVisible} animationType="slide" transparent onRequestClose={() => setSidebarVisible(false)}>
        <Pressable style={styles.sidebarOverlay} onPress={() => setSidebarVisible(false)}>
          <Pressable style={styles.sidebar}>
            <TouchableOpacity style={styles.sidebarClose} onPress={() => setSidebarVisible(false)}>
              <Text style={styles.sidebarCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.sidebarAtelier}>ATELIKO</Text>
            <Text style={styles.sidebarTitle}>Modules</Text>
            {SIDE_MODULES.map(item => (
              <TouchableOpacity key={item.label} style={styles.sidebarItem} onPress={() => goTo(item.screen)}>
                <Text style={styles.sidebarIcon}>{item.icon}</Text>
                <Text style={styles.sidebarLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function BottomBar({navigation, active}) {
  return (
    <View style={styles.bottomBar}>
      {MODULES.map(item => {
        const isActive = active === item.screen;
        return (
          <TouchableOpacity key={item.label} style={styles.bottomItem} onPress={() => navigation.navigate(item.screen)}>
            <Text style={[styles.bottomIcon, isActive && styles.bottomIconActive]}>{item.icon}</Text>
            <Text style={[styles.bottomLabel, isActive && styles.bottomLabelActive]} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function StatusChip({label, color = '#0d6efd', backgroundColor = '#e8f1ff'}) {
  return (
    <View style={[styles.statusChip, {borderColor: color, backgroundColor}]}>
      <Text style={[styles.statusChipText, {color}]}>{label || '—'}</Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  page: {flex: 1, backgroundColor: '#f8f9fa'},
  content: {padding: 18, paddingBottom: 92},
  section: {marginBottom: 22},
  sectionTitle: {fontSize: 18, fontWeight: '900', color: '#222', marginBottom: 12},
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#edf1f6',
    padding: 14,
  },
  panelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
  },
  row: {flexDirection: 'row', alignItems: 'center'},
  between: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {fontSize: 22, fontWeight: '900', color: '#1b2a4a'},
  name: {fontSize: 16, fontWeight: '900', color: '#1f2937'},
  text: {fontSize: 14, color: '#334155'},
  muted: {fontSize: 12, color: '#6b7280'},
  empty: {textAlign: 'center', color: '#6b7280', marginTop: 32},
  search: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5eaf3',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    color: '#1f2937',
  },
  list: {paddingBottom: 92, gap: 10},
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 46,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  roundButtonText: {fontSize: 23, color: '#1b2a4a', fontWeight: '900'},
  headerTextWrap: {flex: 1},
  headerTitle: {fontSize: 16, fontWeight: '900', color: '#0d6efd'},
  headerSubtitle: {fontSize: 14, color: '#333', marginTop: 2},
  profileBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {fontSize: 18},
  profileImage: {width: 40, height: 40, borderRadius: 20},
  sidebarOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-start'},
  sidebar: {
    width: 268,
    height: '100%',
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 112,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 6,
  },
  sidebarClose: {position: 'absolute', top: 112, right: 14, zIndex: 2},
  sidebarCloseText: {fontSize: 22, color: '#dc3545', fontWeight: '900'},
  sidebarAtelier: {fontSize: 18, fontWeight: '900', marginBottom: 6, color: '#0d6efd'},
  sidebarTitle: {fontSize: 20, fontWeight: '900', marginBottom: 18, color: '#222'},
  sidebarItem: {flexDirection: 'row', alignItems: 'center', marginBottom: 18},
  sidebarIcon: {fontSize: 22, marginRight: 12},
  sidebarLabel: {fontSize: 15, color: '#333', fontWeight: '700'},
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 8,
    paddingBottom: 10,
  },
  bottomItem: {flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0},
  bottomIcon: {fontSize: 18, opacity: 0.8},
  bottomIconActive: {opacity: 1},
  bottomLabel: {fontSize: 11, marginTop: 2, color: '#444', fontWeight: '700'},
  bottomLabelActive: {color: '#0d6efd'},
  statusChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  statusChipText: {fontSize: 12, fontWeight: '900'},
});
