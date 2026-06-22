import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/backend';

const CATEGORIES = ['ROBE', 'JUPE', 'HOMME', 'ENFANT', 'AUTRE'];

const categoryLabel = (c) => {
  const map = {
    ROBE: 'Robe',
    JUPE: 'Jupe',
    HOMME: 'Homme',
    ENFANT: 'Enfant',
    AUTRE: 'Autre',
  };
  return map[c] || c;
};

export default function AlbumsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modeles, setModeles] = useState([]);
  const [filteredModeles, setFilteredModeles] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [userData, setUserData] = useState(null);
  const [atelierId, setAtelierId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingModele, setEditingModele] = useState(null);
  const [form, setForm] = useState({
    nom: '',
    categorie: '',
    prix: '',
    description: '',
    photoURL: '',
    videoURL: '',
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  const role = (userData?.role || '').toUpperCase();
  const userPermissions = Array.isArray(userData?.permissions)
    ? userData.permissions.map((p) => (typeof p === 'string' ? p : p?.code)).filter(Boolean)
    : [];

  const hasPermission = (permissionCode) => {
    if (!permissionCode) return true;
    if (['SUPERADMIN', 'PROPRIETAIRE'].includes(role)) return true;
    return userPermissions.includes(permissionCode);
  };

  const canViewAlbums = hasPermission('MODELE_VOIR');
  const canCreateOrEditAlbums = role !== 'TAILLEUR' && (hasPermission('MODELE_CREER') || hasPermission('MODELE_MODIFIER') || canViewAlbums);
  const canDeleteAlbums = role !== 'TAILLEUR' && hasPermission('MODELE_SUPPRIMER');

  const apiBase = useMemo(() => (api?.defaults?.baseURL || '').replace(/\/?api\/?$/i, ''), []);

  const buildMediaUrl = (path, type = 'photo') => {
    if (!path) return null;
    if (String(path).startsWith('http://') || String(path).startsWith('https://')) return path;

    const clean = String(path).replace(/^\/+/, '');
    if (!apiBase) return null;

    if (type === 'video') {
      return `${apiBase}/modeles/videos/${clean.replace('model_video/', '')}`;
    }
    return `${apiBase}/model_photo/${clean.replace('model_photo/', '')}`;
  };

  const applyLocalFilter = useCallback((list, term, cat) => {
    const t = (term || '').trim().toLowerCase();
    const out = (list || []).filter((m) => {
      const matchCategory = !cat || m.categorie === cat;
      if (!matchCategory) return false;
      if (!t) return true;
      const hay = `${m.nom || ''} ${m.description || ''} ${m.categorie || ''}`.toLowerCase();
      return hay.includes(t);
    });
    setFilteredModeles(out);
  }, []);

  const fetchUserContext = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      const parsed = raw ? JSON.parse(raw) : null;
      setUserData(parsed);

      let currentAtelierId = parsed?.atelierId || parsed?.atelier?.id || null;
      if (!currentAtelierId) {
        try {
          const me = await api.get('/auth/me');
          currentAtelierId = me?.data?.atelierId || null;
        } catch (e) {
          currentAtelierId = null;
        }
      }
      setAtelierId(currentAtelierId);
    } catch (e) {
      setUserData(null);
      setAtelierId(null);
    }
  }, []);

  const fetchModeles = useCallback(async ({ silent = false } = {}) => {
    if (!atelierId || !canViewAlbums) {
      setModeles([]);
      setFilteredModeles([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      const res = await api.get(`/modeles/atelier/${atelierId}`);
      const list = Array.isArray(res?.data) ? res.data : [];
      setModeles(list);
      applyLocalFilter(list, search, categoryFilter);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les albums');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [atelierId, canViewAlbums, applyLocalFilter, search, categoryFilter]);

  useEffect(() => {
    fetchUserContext();
  }, [fetchUserContext]);

  useEffect(() => {
    fetchModeles();
  }, [fetchModeles]);

  useEffect(() => {
    applyLocalFilter(modeles, search, categoryFilter);
  }, [search, categoryFilter, modeles, applyLocalFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchModeles({ silent: true });
  };

  const resetForm = () => {
    setForm({
      nom: '',
      categorie: '',
      prix: '',
      description: '',
      photoURL: '',
      videoURL: '',
    });
    setPhotoPreview(null);
    setVideoPreview(null);
    setPhotoFile(null);
    setVideoFile(null);
    setEditingModele(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (modele) => {
    setEditingModele(modele);
    setForm({
      nom: modele?.nom || '',
      categorie: modele?.categorie || '',
      prix: String(modele?.prix || ''),
      description: modele?.description || '',
      photoURL:
        modele?.photoPath && (String(modele.photoPath).startsWith('http://') || String(modele.photoPath).startsWith('https://'))
          ? modele.photoPath
          : '',
      videoURL:
        modele?.videoPath && (String(modele.videoPath).startsWith('http://') || String(modele.videoPath).startsWith('https://'))
          ? modele.videoPath
          : '',
    });
    setPhotoPreview(buildMediaUrl(modele?.photoPath, 'photo'));
    setVideoPreview(buildMediaUrl(modele?.videoPath, 'video'));
    setPhotoFile(null);
    setVideoFile(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const pickMedia = async (target) => {
    try {
      console.log(`🎯 Tentative d'ouverture de la galerie pour ${target}`);

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📋 Permissions galerie:', perm);

      if (!perm.granted) {
        Alert.alert('Permission refusée', 'Autorisez la galerie pour sélectionner un fichier.');
        return;
      }

      console.log(`📂 Ouverture du sélecteur de ${target}...`);
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: target === 'photo',
        quality: 0.85,
      });

      console.log('📋 Résultat du sélecteur:', result);

      if (result.canceled) {
        console.log('❌ Sélection annulée par l\'utilisateur');
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        console.log('❌ Aucun fichier sélectionné');
        return;
      }

      console.log('✅ Fichier sélectionné:', asset.uri);

      const file = {
        uri: asset.uri,
        type: asset.mimeType || (target === 'photo' ? 'image/jpeg' : 'video/mp4'),
        name: asset.fileName || `${target}-${Date.now()}.${target === 'photo' ? 'jpg' : 'mp4'}`,
      };

      if (target === 'photo') {
        setPhotoFile(file);
        setPhotoPreview(asset.uri);
        setForm((prev) => ({ ...prev, photoURL: '' }));
        console.log('📸 Photo définie');
      } else {
        setVideoFile(file);
        setVideoPreview(asset.uri);
        setForm((prev) => ({ ...prev, videoURL: '' }));
        console.log('🎬 Vidéo définie');
      }
    } catch (error) {
      console.error('💥 Erreur lors de la sélection de média:', error);
      Alert.alert('Erreur', `Impossible de sélectionner le ${target}: ${error.message}`);
    }
  };

  const saveModele = async () => {
    if (!atelierId) {
      Alert.alert('Erreur', 'Atelier introuvable, reconnectez-vous.');
      return;
    }

    if (!form.nom.trim()) {
      Alert.alert('Validation', 'Le nom du modèle est obligatoire.');
      return;
    }
    if (!form.categorie) {
      Alert.alert('Validation', 'La catégorie est obligatoire.');
      return;
    }
    if (!form.prix || Number(form.prix) < 0) {
      Alert.alert('Validation', 'Le prix doit être valide.');
      return;
    }

    try {
      setSaving(true);
      const modelePayload = {
        nom: form.nom.trim(),
        categorie: form.categorie,
        prix: Number(form.prix),
        description: form.description?.trim() || '',
      };

      if (!editingModele) {
        modelePayload.atelierId = atelierId;
      }
      if (!photoFile?.uri && form.photoURL?.trim()) {
        modelePayload.photoPath = form.photoURL.trim();
      }
      if (!videoFile?.uri && form.videoURL?.trim()) {
        modelePayload.videoPath = form.videoURL.trim();
      }

      const data = new FormData();
      data.append('modele', JSON.stringify(modelePayload));

      if (photoFile?.uri) data.append('photo', photoFile);
      if (videoFile?.uri) data.append('video', videoFile);

      if (editingModele?.id) {
        await api.put(`/modeles/${editingModele.id}/atelier/${atelierId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/modeles', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      closeForm();
      await fetchModeles({ silent: true });
      Alert.alert('Succès', editingModele ? 'Album modifié avec succès.' : 'Album créé avec succès.');
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible d’enregistrer cet album.');
    } finally {
      setSaving(false);
    }
  };

  const deleteModele = (modele) => {
    Alert.alert(
      'Suppression',
      `Supprimer l'album "${modele?.nom || 'sans nom'}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/modeles/${modele.id}/atelier/${atelierId}`);
              await fetchModeles({ silent: true });
              Alert.alert('Succès', 'Album supprimé.');
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer cet album.');
            }
          },
        },
      ]
    );
  };

  const renderCard = ({ item }) => {
    const image = buildMediaUrl(item.photoPath, 'photo');
    const video = buildMediaUrl(item.videoPath, 'video');

    return (
      <View style={styles.card}>
        <View style={styles.mediaWrap}>
          {image ? (
            <Image source={{ uri: image }} style={styles.media} resizeMode="cover" />
          ) : (
            <View style={styles.mediaPlaceholder}>
              <Text style={styles.mediaPlaceholderText}>🖼️</Text>
            </View>
          )}

          {video ? (
            <View style={styles.videoBadge}>
              <Text style={styles.videoBadgeText}>🎬 Vidéo</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.modelName}>{item.nom || 'Sans nom'}</Text>
        <Text style={styles.modelDesc}>{item.description || 'Aucune description'}</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.price}>{Number(item.prix || 0).toLocaleString('fr-FR')} FCFA</Text>
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{categoryLabel(item.categorie)}</Text>
          </View>
        </View>

        {(canCreateOrEditAlbums || canDeleteAlbums) ? (
          <View style={styles.actionsRow}>
            {canCreateOrEditAlbums ? (
              <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => openEdit(item)}>
                <Text style={styles.actionText}>✏️ Modifier</Text>
              </TouchableOpacity>
            ) : null}
            {canDeleteAlbums ? (
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => deleteModele(item)}>
                <Text style={styles.actionText}>🗑 Supprimer</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Albums</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {!canViewAlbums ? (
        <View style={styles.noPermissionBox}>
          <Text style={styles.noPermissionText}>Vous n'avez pas la permission de voir les albums.</Text>
        </View>
      ) : (
        <>
          <View style={styles.filtersWrap}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher un album..."
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
              <TouchableOpacity
                style={[styles.catFilterBtn, !categoryFilter && styles.catFilterBtnActive]}
                onPress={() => setCategoryFilter('')}
              >
                <Text style={[styles.catFilterText, !categoryFilter && styles.catFilterTextActive]}>Tous</Text>
              </TouchableOpacity>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catFilterBtn, categoryFilter === c && styles.catFilterBtnActive]}
                  onPress={() => setCategoryFilter(c)}
                >
                  <Text style={[styles.catFilterText, categoryFilter === c && styles.catFilterTextActive]}>
                    {categoryLabel(c)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {canCreateOrEditAlbums ? (
            <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
              <Text style={styles.addBtnText}>+ Nouvel album</Text>
            </TouchableOpacity>
          ) : null}

          {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : null}

          <FlatList
            data={filteredModeles}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCard}
            contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyTitle}>Aucun album</Text>
                  <Text style={styles.emptySub}>Ajoutez votre premier modèle comme sur le web.</Text>
                </View>
              ) : null
            }
          />
        </>
      )}

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingModele ? 'Modifier album' : 'Nouvel album'}</Text>
              <TouchableOpacity onPress={closeForm}>
                <Text style={styles.modalClose}>✖</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.inputLabel}>Nom</Text>
              <TextInput
                style={styles.input}
                value={form.nom}
                onChangeText={(v) => setForm((prev) => ({ ...prev, nom: v }))}
                placeholder="Nom du modèle"
              />

              <Text style={styles.inputLabel}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={`edit-${c}`}
                    style={[styles.catFilterBtn, form.categorie === c && styles.catFilterBtnActive]}
                    onPress={() => setForm((prev) => ({ ...prev, categorie: c }))}
                  >
                    <Text style={[styles.catFilterText, form.categorie === c && styles.catFilterTextActive]}>
                      {categoryLabel(c)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Prix (FCFA)</Text>
              <TextInput
                style={styles.input}
                value={form.prix}
                keyboardType="decimal-pad"
                onChangeText={(v) => setForm((prev) => ({ ...prev, prix: v }))}
                placeholder="Ex: 15000"
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                multiline
                value={form.description}
                onChangeText={(v) => setForm((prev) => ({ ...prev, description: v }))}
                placeholder="Description"
              />

              <Text style={styles.inputLabel}>Photo du modèle</Text>
              <View style={styles.mediaRow}>
                <TouchableOpacity style={styles.mediaBtn} onPress={() => pickMedia('photo')}>
                  <Text style={styles.mediaBtnText}>📁 Galerie photo</Text>
                </TouchableOpacity>
              </View>
              {photoPreview ? <Image source={{ uri: photoPreview }} style={styles.previewMedia} resizeMode="cover" /> : null}

              <Text style={styles.inputLabel}>Ou URL de l'image</Text>
              <TextInput
                style={styles.input}
                value={form.photoURL}
                onChangeText={(v) => {
                  setForm((prev) => ({ ...prev, photoURL: v }));
                  setPhotoPreview(v || null);
                  setPhotoFile(null);
                }}
                placeholder="https://exemple.com/image.jpg"
              />

              <Text style={styles.inputLabel}>Vidéo du modèle</Text>
              <View style={styles.mediaRow}>
                <TouchableOpacity style={styles.mediaBtn} onPress={() => pickMedia('video')}>
                  <Text style={styles.mediaBtnText}>🎬 Galerie vidéo</Text>
                </TouchableOpacity>
              </View>

              {videoPreview ? (
                <View style={styles.videoPreviewBox}>
                  <Text style={styles.videoPreviewText}>🎬 Vidéo sélectionnée</Text>
                  <Text style={styles.videoPreviewSub} numberOfLines={1}>{videoPreview}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Ou URL de la vidéo</Text>
              <TextInput
                style={styles.input}
                value={form.videoURL}
                onChangeText={(v) => {
                  setForm((prev) => ({ ...prev, videoURL: v }));
                  setVideoPreview(v || null);
                  setVideoFile(null);
                }}
                placeholder="https://exemple.com/video.mp4"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={saveModele} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },
  headerRow: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef0f4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f4fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 20, color: '#1b2a4a', fontWeight: '700' },
  backBtnPlaceholder: { width: 34, height: 34 },
  title: { fontSize: 22, fontWeight: '900', color: '#1b2a4a' },

  filtersWrap: { paddingHorizontal: 12, paddingTop: 12 },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e5ef',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  catRow: { gap: 8, paddingVertical: 2 },
  catFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbe2f0',
    backgroundColor: '#fff',
  },
  catFilterBtnActive: {
    backgroundColor: '#0d6efd',
    borderColor: '#0d6efd',
  },
  catFilterText: { color: '#2c3b5b', fontWeight: '700' },
  catFilterTextActive: { color: '#fff' },

  addBtn: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#0d6efd',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '900' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ebeff7',
  },
  mediaWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eef2fa',
    height: 170,
    marginBottom: 10,
  },
  media: { width: '100%', height: '100%' },
  mediaPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mediaPlaceholderText: { fontSize: 34 },
  videoBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  videoBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  modelName: { fontSize: 16, fontWeight: '900', color: '#1f2c48' },
  modelDesc: { marginTop: 4, color: '#6c7894' },
  rowBetween: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { color: '#0d6efd', fontWeight: '900' },
  catBadge: {
    backgroundColor: '#eef3ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  catText: { fontSize: 12, fontWeight: '700', color: '#3657a7' },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  editBtn: { backgroundColor: '#f4b324' },
  deleteBtn: { backgroundColor: '#dc3545' },
  actionText: { color: '#fff', fontWeight: '900' },

  noPermissionBox: {
    margin: 16,
    backgroundColor: '#fff3f3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffd6d6',
    padding: 14,
  },
  noPermissionText: { color: '#a52a2a', fontWeight: '700' },

  emptyWrap: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#23335b' },
  emptySub: { marginTop: 8, color: '#697896', textAlign: 'center' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,18,35,0.45)',
    justifyContent: 'center',
    padding: 14,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    maxHeight: '90%',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1b2a4a' },
  modalClose: { fontSize: 18, color: '#a1abc0' },

  inputLabel: { marginTop: 8, marginBottom: 6, fontWeight: '800', color: '#2b3a58' },
  input: {
    borderWidth: 1,
    borderColor: '#dfe5f1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },

  mediaRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  mediaBtn: {
    backgroundColor: '#eef3ff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  mediaBtnText: { color: '#2f4f99', fontWeight: '800' },

  previewMedia: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 8,
    marginTop: 2,
  },
  videoPreviewBox: {
    borderWidth: 1,
    borderColor: '#dce3f2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    marginTop: 2,
    backgroundColor: '#f7f9fe',
  },
  videoPreviewText: { fontWeight: '800', color: '#2c3b5b' },
  videoPreviewSub: { color: '#5e6b86', marginTop: 2 },

  saveBtn: {
    marginTop: 14,
    backgroundColor: '#0d6efd',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  saveBtnText: { color: '#fff', fontWeight: '900' },
});
