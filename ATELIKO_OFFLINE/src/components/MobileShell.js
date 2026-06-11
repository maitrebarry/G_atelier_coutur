import React, {useEffect, useState} from 'react';
import {Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, Image} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PhotoPicker from './PhotoPicker';
import {getUserProfile, setUserProfilePhoto} from '../services/userService';
import {exportDatabaseToDownloads, importDatabaseFromDownloads, getBackupDirectory} from '../services/databaseBackupService';

Ionicons.loadFont();

const MODULES = [
  {label: 'Accueil', icon: 'home-outline', screen: 'Home'},
  {label: 'Clients', icon: 'people-outline', screen: 'Clients'},
  {label: 'Albums', icon: 'image-outline', screen: 'Modeles'},
  {label: 'Paiements', icon: 'card-outline', screen: 'Payments'},
  {label: 'RDV', icon: 'calendar-outline', screen: 'Rendezvous'},
];

const SIDE_MODULES = [
  {label: 'Clients', icon: 'people-outline', screen: 'Clients'},
  {label: 'Nouveau client', icon: 'person-add-outline', screen: 'ClientForm'},
  {label: 'Albums / modèles', icon: 'image-outline', screen: 'Modeles'},
  {label: 'Paiements', icon: 'card-outline', screen: 'Payments'},
  {label: 'Rendez-vous', icon: 'calendar-outline', screen: 'Rendezvous'},
  {label: 'Tailleurs', icon: 'cut-outline', screen: 'Tailleurs'},
];

export function AppHeader({navigation, title = '', subtitle = '', showBack = false}) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [atelierName, setAtelierName] = useState('');
  const [profileModal, setProfileModal] = useState(false);

  const goTo = screen => {
    setSidebarVisible(false);
    navigation.navigate(screen);
  };

  const handleExportDatabase = async () => {
    setSidebarVisible(false);
    try {
      const exportedPath = await exportDatabaseToDownloads();
      Alert.alert('Export réussi', `Sauvegarde créée dans :\n${exportedPath}`);
    } catch (error) {
      console.error('Export database failed', error);
      Alert.alert('Échec de l’export', error?.message || 'Impossible d’exporter la base de données.');
    }
  };

  const handleImportDatabase = () => {
    setSidebarVisible(false);
    Alert.alert(
      'Importer la base',
      `Le fichier doit se trouver dans :\n${getBackupDirectory()}\n\nImporter la dernière sauvegarde ?`,
      [
        {text: 'Annuler', style: 'cancel'},
        {text: 'Importer', onPress: async () => {
          try {
            const importedPath = await importDatabaseFromDownloads();
            Alert.alert('Import réussi', `Base restaurée depuis :\n${importedPath}`);
          } catch (error) {
            console.error('Import database failed', error);
            Alert.alert('Échec de l’import', error?.message || 'Impossible d’importer la base de données.');
          }
        }},
      ],
    );
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await getUserProfile();
        if (!mounted) return;
        setProfilePhoto(p.photo || null);
        setAtelierName(p.atelier?.name || p.activation?.payload?.atelierName || p.activation?.payload?.issuedBy || 'Votre atelier');
      } catch (e) {
        console.error('load profile photo', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const displayTitle = title || atelierName || 'Atelier';

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
            <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.profileBubble} onPress={() => setProfileModal(true)}>
          {profilePhoto ? (
            <Image source={{uri: profilePhoto}} style={styles.profileImage} />
          ) : (
            <Ionicons name="person-circle-outline" size={30} color="#475569" />
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
              <Ionicons name="close-outline" size={24} color="#334155" />
            </TouchableOpacity>
            <Text style={styles.sidebarAtelier}>{atelierName}</Text>
            <Text style={styles.sidebarTitle}>Modules</Text>
            {SIDE_MODULES.map(item => (
              <TouchableOpacity key={item.label} style={styles.sidebarItem} onPress={() => goTo(item.screen)}>
                <Ionicons name={item.icon} size={20} color="#0d6efd" style={styles.sidebarIcon} />
                <Text style={styles.sidebarLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.sidebarDivider} />
            <Text style={styles.sidebarSectionTitle}>Sauvegarde</Text>
            <TouchableOpacity style={styles.sidebarItem} onPress={handleExportDatabase}>
              <Ionicons name="download-outline" size={20} color="#0d6efd" style={styles.sidebarIcon} />
              <Text style={styles.sidebarLabel}>Exporter la base</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sidebarItem} onPress={handleImportDatabase}>
              <Ionicons name="cloud-download-outline" size={20} color="#0d6efd" style={styles.sidebarIcon} />
              <Text style={styles.sidebarLabel}>Importer la base</Text>
            </TouchableOpacity>
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
            <Ionicons name={item.icon} size={22} color={isActive ? '#0d6efd' : '#64748b'} />
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
  page: {flex: 1, backgroundColor: '#f4f6fb'},
  content: {padding: 20, paddingBottom: 112},
  section: {marginBottom: 24},
  sectionTitle: {fontSize: 20, fontWeight: '900', color: '#152238', marginBottom: 14},
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eef2f8',
    padding: 18,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 10},
    elevation: 4,
  },
  panelCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eef2f8',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
  },
  row: {flexDirection: 'row', alignItems: 'center'},
  between: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {fontSize: 24, fontWeight: '900', color: '#152238'},
  name: {fontSize: 18, fontWeight: '900', color: '#1f2937'},
  text: {fontSize: 15, color: '#334155'},
  muted: {fontSize: 13, color: '#62748c'},
  empty: {textAlign: 'center', color: '#62748c', marginTop: 36},
  search: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    color: '#0f172a',
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  list: {paddingBottom: 112, gap: 14},
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 46,
    paddingBottom: 18,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 6},
    elevation: 4,
  },
  headerLeft: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextWrap: {flex: 1},
  headerTitle: {fontSize: 18, fontWeight: '900', color: '#0f172a'},
  headerSubtitle: {fontSize: 13, color: '#6b7280', marginTop: 2},
  profileBubble: {
    width: 44,
    height: 44,
    borderRadius: 16,
    marginLeft: 8,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {width: 44, height: 44, borderRadius: 16},
  sidebarOverlay: {flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.18)', justifyContent: 'flex-start'},
  sidebar: {
    width: 280,
    height: '100%',
    backgroundColor: '#ffffff',
    padding: 24,
    paddingTop: 108,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: {width: -4, height: 12},
    elevation: 7,
  },
  sidebarClose: {position: 'absolute', top: 108, right: 18, zIndex: 2},
  sidebarAtelier: {fontSize: 18, fontWeight: '900', marginBottom: 4, color: '#0d6efd'},
  sidebarTitle: {fontSize: 20, fontWeight: '900', marginBottom: 18, color: '#152238'},
  sidebarItem: {flexDirection: 'row', alignItems: 'center', marginBottom: 18, paddingVertical: 8},
  sidebarIcon: {marginRight: 14},
  sidebarLabel: {fontSize: 15, color: '#334155', fontWeight: '700'},
  sidebarDivider: {height: 1, backgroundColor: '#e2e8f0', marginVertical: 16},
  sidebarSectionTitle: {fontSize: 13, color: '#64748b', fontWeight: '800', marginBottom: 12},
  bottomBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 6,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 10},
    elevation: 6,
  },
  bottomItem: {flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0},
  bottomLabel: {fontSize: 11, marginTop: 2, color: '#64748b', fontWeight: '700'},
  bottomLabelActive: {color: '#0d6efd'},
  statusChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  statusChipText: {fontSize: 12, fontWeight: '900', letterSpacing: 0.35},
});
