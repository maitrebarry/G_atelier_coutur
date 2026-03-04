import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  TextInput,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ClientListScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [habitPhotoPreview, setHabitPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [habitPhotoFile, setHabitPhotoFile] = useState(null);
  const [habitPhotoCleared, setHabitPhotoCleared] = useState(false);
  const [userData, setUserData] = useState(null);

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
  const canEditClients = role !== 'TAILLEUR' && (hasPermission('CLIENT_MODIFIER') || hasPermission('CLIENT_CREER') || hasPermission('CLIENT_VOIR'));
  const canDeleteClients = role !== 'TAILLEUR' && hasPermission('CLIENT_SUPPRIMER');

  const apiBase = useMemo(() => (api?.defaults?.baseURL || '').replace(/\/?api\/?$/i, ''), []);

  const normalizeStoredPath = (value, folderPrefix) => {
    if (!value) return '';
    return String(value).replace(/^\/+/, '').replace(`${folderPrefix}/`, '');
  };

  const buildPhotoUrl = (value, folderPrefix) => {
    if (!value) return null;
    if (String(value).startsWith('http')) return value;
    const clean = normalizeStoredPath(value, folderPrefix);
    if (!apiBase) return null;
    return `${apiBase}/${folderPrefix}/${clean}`;
  };

  const buildModelPhotoUrl = (mesure) => buildPhotoUrl(mesure?.photoPath, 'model_photo');
  const buildHabitPhotoUrl = (mesure) => buildPhotoUrl(mesure?.habitPhotoPath, 'habit_photo');

  const fetchClients = async ({ silent = false } = {}) => {
    if (userData && !canViewClients) {
      setClients([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/clients');
      setClients(res.data || []);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les clients');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('userData');
        setUserData(raw ? JSON.parse(raw) : null);
      } catch (e) {
        setUserData(null);
      }
    })();
  }, []);

  useEffect(() => {
    fetchClients();
  }, [userData]);

  const openClientDetails = async (id) => {
    try {
      const res = await api.get(`/clients/${id}`);
      setSelectedClient(res.data || null);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les détails du client');
    }
  };

  const openEditClient = async (id) => {
    try {
      const res = await api.get(`/clients/${id}`);
      const c = res.data || {};
      const m = c?.mesures?.[0] || {};
      setEditingClient(c);
      setEditFormData({
        nom: c.nom || '',
        prenom: c.prenom || '',
        contact: c.contact || '',
        adresse: c.adresse || '',
        email: c.email || '',
        sexe: m.sexe || 'Femme',
        typeVetement: m.typeVetement || 'robe',
        prix: String(m.prix || ''),
        description: m.description || '',
        epaule: m.epaule || '',
        manche: m.manche || '',
        poitrine: m.poitrine || '',
        taille: m.taille || '',
        longueur: m.longueur || '',
        fesse: m.fesse || '',
        tourManche: m.tourManche || '',
        longueurPoitrine: m.longueurPoitrine || '',
        longueurTaille: m.longueurTaille || '',
        longueurFesse: m.longueurFesse || '',
        longueurJupe: m.longueurJupe || '',
        ceinture: m.ceinture || '',
        longueurPantalon: m.longueurPantalon || '',
        cuisse: m.cuisse || '',
        corps: m.corps || '',
      });
      setPhotoPreview(buildModelPhotoUrl(m));
      setHabitPhotoPreview(buildHabitPhotoUrl(m));
      setPhotoFile(null);
      setHabitPhotoFile(null);
      setHabitPhotoCleared(false);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les données du client à modifier');
    }
  };

  const handleDeleteClient = (id) => {
    Alert.alert(
      'Suppression',
      'Voulez-vous vraiment supprimer ce client ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/clients/${id}`);
              await fetchClients({ silent: true });
              Alert.alert('Succès', 'Client supprimé');
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer le client');
            }
          },
        },
      ]
    );
  };

  const onEditChange = (name, value) => {
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getPickedFile = (asset, fallback) => {
    if (!asset?.uri) return null;
    return {
      uri: asset.uri,
      type: asset.mimeType || 'image/jpeg',
      name: asset.fileName || `${fallback}.jpg`,
    };
  };

  const pickPhoto = async (target) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', 'Autorisez la galerie pour sélectionner une image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    const file = getPickedFile(asset, target === 'photo' ? 'client-photo' : 'habit-photo');
    if (!file) return;
    if (target === 'photo') {
      setPhotoFile(file);
      setPhotoPreview(asset.uri);
    } else {
      setHabitPhotoFile(file);
      setHabitPhotoPreview(asset.uri);
      setHabitPhotoCleared(false);
    }
  };

  const takePhoto = async (target) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', 'Autorisez la caméra pour prendre une image.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    const file = getPickedFile(asset, target === 'photo' ? 'client-photo' : 'habit-photo');
    if (!file) return;
    if (target === 'photo') {
      setPhotoFile(file);
      setPhotoPreview(asset.uri);
    } else {
      setHabitPhotoFile(file);
      setHabitPhotoPreview(asset.uri);
      setHabitPhotoCleared(false);
    }
  };

  const saveClientEdit = async () => {
    if (!editingClient || !editFormData) return;
    if (!editFormData.nom || !editFormData.prenom || !editFormData.contact) {
      Alert.alert('Erreur', 'Nom, prénom et contact sont requis');
      return;
    }

    try {
      setSavingEdit(true);
      const data = new FormData();
      ['nom', 'prenom', 'contact', 'adresse', 'email', 'sexe', 'prix', 'description'].forEach((k) => {
        data.append(k, String(editFormData[k] || ''));
      });

      if (photoFile?.uri) {
        data.append('photo', photoFile);
      } else if (editingClient?.mesures?.[0]?.photoPath) {
        data.append('existing_photo', normalizeStoredPath(editingClient.mesures[0].photoPath, 'model_photo'));
      }

      if (habitPhotoFile?.uri) {
        data.append('habitPhoto', habitPhotoFile);
      } else if (!habitPhotoCleared && editingClient?.mesures?.[0]?.habitPhotoPath) {
        data.append('existing_habit_photo', normalizeStoredPath(editingClient.mesures[0].habitPhotoPath, 'habit_photo'));
      }

      if (editFormData.sexe === 'Femme') {
        const t = String(editFormData.typeVetement || 'robe').toLowerCase();
        data.append('femme_type_edit', t);
        if (t === 'robe') {
          ['epaule', 'manche', 'poitrine', 'taille', 'longueur', 'fesse', 'tourManche', 'longueurPoitrine', 'longueurTaille', 'longueurFesse'].forEach((field) => {
            data.append(`robe_${field}`, String(editFormData[field] || ''));
          });
        } else {
          ['epaule', 'manche', 'poitrine', 'taille', 'longueur', 'longueurJupe', 'ceinture', 'fesse', 'tourManche', 'longueurPoitrine', 'longueurTaille', 'longueurFesse'].forEach((field) => {
            data.append(`jupe_${field}`, String(editFormData[field] || ''));
          });
        }
      } else {
        ['epaule', 'manche', 'longueur', 'longueurPantalon', 'ceinture', 'cuisse', 'poitrine', 'corps', 'tourManche'].forEach((field) => {
          data.append(`homme_${field}`, String(editFormData[field] || ''));
        });
      }

      await api.put(`/clients/${editingClient.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setEditingClient(null);
      setEditFormData(null);
      await fetchClients({ silent: true });
      Alert.alert('Succès', 'Client modifié avec succès');
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de modifier le client');
    } finally {
      setSavingEdit(false);
    }
  };

  const selectedMesure = selectedClient?.mesures?.[0] || null;

  const renderMeasureLine = (label, value) => (
    value ? <Text style={styles.detailLine}>{label}: {String(value)}</Text> : null
  );

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
        <Text style={styles.title}>Clients</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <View style={styles.topRow}>
        {canEditClients ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('MesureAdd')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.addBtnText}>+ Ajouter un client</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {!canViewClients ? (
        <View style={styles.noPermissionBox}>
          <Text style={styles.noPermissionText}>Vous n'avez pas la permission de voir les clients.</Text>
        </View>
      ) : null}

      {loading && canViewClients ? <ActivityIndicator style={{ marginBottom: 10 }} /> : null}

      {canViewClients ? (
      <FlatList
        data={clients}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{`${item.prenom || ''} ${item.nom || ''}`.trim() || item.fullName || item.name}</Text>
            <Text style={styles.small}>{item.contact || item.email || item.telephone || '—'}</Text>
            <Text style={styles.actionsLabel}>Actions</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={() => openClientDetails(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.actionBtnText}>👁 Détail</Text>
              </TouchableOpacity>
              {canEditClients ? (
                <TouchableOpacity style={[styles.actionBtn, styles.warnBtn]} onPress={() => openEditClient(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.actionBtnText}>✏️ Modifier</Text>
                </TouchableOpacity>
              ) : null}
              {canDeleteClients ? (
                <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => handleDeleteClient(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.actionBtnText}>🗑 Supprimer</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchClients({ silent: true });
            }}
          />
        }
        ListEmptyComponent={<Text>Aucun client</Text>}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
      ) : null}

      <Modal visible={!!selectedClient} transparent animationType="slide" onRequestClose={() => setSelectedClient(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {`${selectedClient?.prenom || ''} ${selectedClient?.nom || ''}`.trim()}
              </Text>
              <TouchableOpacity onPress={() => setSelectedClient(null)}>
                <Text style={{ color: '#dc3545', fontWeight: '700' }}>Fermer</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {buildModelPhotoUrl(selectedMesure) ? (
                <Image source={{ uri: buildModelPhotoUrl(selectedMesure) }} style={styles.detailPhoto} />
              ) : null}

              <Text style={styles.detailLine}>Contact: {selectedClient?.contact || '—'}</Text>
              <Text style={styles.detailLine}>Email: {selectedClient?.email || '—'}</Text>
              <Text style={styles.detailLine}>Adresse: {selectedClient?.adresse || '—'}</Text>

              <View style={styles.sep} />
              <Text style={styles.detailTitle}>Dernière mesure</Text>
              <Text style={styles.detailLine}>Sexe: {selectedMesure?.sexe || '—'}</Text>
              <Text style={styles.detailLine}>Type: {selectedMesure?.typeVetement || '—'}</Text>
              <Text style={styles.detailLine}>Prix: {selectedMesure?.prix ? `${selectedMesure.prix} FCFA` : '—'}</Text>
              <Text style={styles.detailLine}>Description: {selectedMesure?.description || '—'}</Text>

              {selectedMesure?.sexe === 'Femme' ? (
                <>
                  {renderMeasureLine('Épaule', selectedMesure?.epaule)}
                  {renderMeasureLine('Manche', selectedMesure?.manche)}
                  {renderMeasureLine('Poitrine', selectedMesure?.poitrine)}
                  {renderMeasureLine('Taille', selectedMesure?.taille)}
                  {renderMeasureLine('Longueur', selectedMesure?.longueur)}
                  {selectedMesure?.typeVetement === 'jupe' ? renderMeasureLine('Longueur jupe', selectedMesure?.longueurJupe) : null}
                  {selectedMesure?.typeVetement === 'jupe' ? renderMeasureLine('Ceinture', selectedMesure?.ceinture) : null}
                  {renderMeasureLine('Fesse', selectedMesure?.fesse)}
                  {renderMeasureLine('Tour de manche', selectedMesure?.tourManche)}
                  {renderMeasureLine('Longueur poitrine', selectedMesure?.longueurPoitrine)}
                  {renderMeasureLine('Longueur taille', selectedMesure?.longueurTaille)}
                  {renderMeasureLine('Longueur fesse', selectedMesure?.longueurFesse)}
                </>
              ) : (
                <>
                  {renderMeasureLine('Épaule', selectedMesure?.epaule)}
                  {renderMeasureLine('Manche', selectedMesure?.manche)}
                  {renderMeasureLine('Longueur', selectedMesure?.longueur)}
                  {renderMeasureLine('Longueur pantalon', selectedMesure?.longueurPantalon)}
                  {renderMeasureLine('Ceinture', selectedMesure?.ceinture)}
                  {renderMeasureLine('Cuisse', selectedMesure?.cuisse)}
                  {renderMeasureLine('Poitrine', selectedMesure?.poitrine)}
                  {renderMeasureLine('Coude', selectedMesure?.corps)}
                  {renderMeasureLine('Tour de manche', selectedMesure?.tourManche)}
                </>
              )}

              {buildHabitPhotoUrl(selectedMesure) ? (
                <>
                  <View style={styles.sep} />
                  <Text style={styles.detailTitle}>Photo de l'habit</Text>
                  <Image source={{ uri: buildHabitPhotoUrl(selectedMesure) }} style={styles.detailPhoto} />
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!editingClient && canEditClients} transparent animationType="slide" onRequestClose={() => { setEditingClient(null); setEditFormData(null); }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier client</Text>
              <TouchableOpacity onPress={() => { setEditingClient(null); setEditFormData(null); }}>
                <Text style={{ color: '#dc3545', fontWeight: '700' }}>Fermer</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {photoPreview ? <Image source={{ uri: photoPreview }} style={styles.editPhoto} /> : null}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={() => takePhoto('photo')}>
                  <Text style={styles.actionBtnText}>Caméra modèle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={() => pickPhoto('photo')}>
                  <Text style={styles.actionBtnText}>Galerie modèle</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={() => takePhoto('habit')}>
                  <Text style={styles.actionBtnText}>Caméra habit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={() => pickPhoto('habit')}>
                  <Text style={styles.actionBtnText}>Galerie habit</Text>
                </TouchableOpacity>
                {habitPhotoPreview ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.dangerBtn]}
                    onPress={() => {
                      setHabitPhotoFile(null);
                      setHabitPhotoPreview(null);
                      setHabitPhotoCleared(true);
                    }}
                  >
                    <Text style={styles.actionBtnText}>Effacer habit</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {habitPhotoPreview ? <Image source={{ uri: habitPhotoPreview }} style={styles.editPhoto} /> : null}

              <TextInput style={styles.input} placeholder="Nom" value={editFormData?.nom || ''} onChangeText={(v) => onEditChange('nom', v)} />
              <TextInput style={styles.input} placeholder="Prénom" value={editFormData?.prenom || ''} onChangeText={(v) => onEditChange('prenom', v)} />
              <TextInput style={styles.input} placeholder="Contact" value={editFormData?.contact || ''} onChangeText={(v) => onEditChange('contact', v)} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="Adresse" value={editFormData?.adresse || ''} onChangeText={(v) => onEditChange('adresse', v)} />
              <TextInput style={styles.input} placeholder="Email" value={editFormData?.email || ''} onChangeText={(v) => onEditChange('email', v)} />

              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, editFormData?.sexe === 'Femme' ? styles.infoBtn : styles.warnBtn]} onPress={() => onEditChange('sexe', 'Femme')}>
                  <Text style={styles.actionBtnText}>Femme</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, editFormData?.sexe === 'Homme' ? styles.infoBtn : styles.warnBtn]} onPress={() => onEditChange('sexe', 'Homme')}>
                  <Text style={styles.actionBtnText}>Homme</Text>
                </TouchableOpacity>
              </View>

              {editFormData?.sexe === 'Femme' ? (
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={[styles.actionBtn, String(editFormData?.typeVetement || '').toLowerCase() === 'robe' ? styles.infoBtn : styles.warnBtn]} onPress={() => onEditChange('typeVetement', 'robe')}>
                    <Text style={styles.actionBtnText}>Robe</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, String(editFormData?.typeVetement || '').toLowerCase() === 'jupe' ? styles.infoBtn : styles.warnBtn]} onPress={() => onEditChange('typeVetement', 'jupe')}>
                    <Text style={styles.actionBtnText}>Jupe</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <TextInput style={styles.input} placeholder="Prix" value={editFormData?.prix || ''} onChangeText={(v) => onEditChange('prix', v)} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Description" value={editFormData?.description || ''} onChangeText={(v) => onEditChange('description', v)} />

              {editFormData?.sexe === 'Femme' && String(editFormData?.typeVetement || '').toLowerCase() === 'robe' ? (
                <>
                  <TextInput style={styles.input} placeholder="Épaule" value={String(editFormData?.epaule || '')} onChangeText={(v) => onEditChange('epaule', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Manche" value={String(editFormData?.manche || '')} onChangeText={(v) => onEditChange('manche', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Poitrine" value={String(editFormData?.poitrine || '')} onChangeText={(v) => onEditChange('poitrine', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Taille" value={String(editFormData?.taille || '')} onChangeText={(v) => onEditChange('taille', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Longueur" value={String(editFormData?.longueur || '')} onChangeText={(v) => onEditChange('longueur', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Fesse" value={String(editFormData?.fesse || '')} onChangeText={(v) => onEditChange('fesse', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Tour manche" value={String(editFormData?.tourManche || '')} onChangeText={(v) => onEditChange('tourManche', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Longueur poitrine" value={String(editFormData?.longueurPoitrine || '')} onChangeText={(v) => onEditChange('longueurPoitrine', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Longueur taille" value={String(editFormData?.longueurTaille || '')} onChangeText={(v) => onEditChange('longueurTaille', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Longueur fesse" value={String(editFormData?.longueurFesse || '')} onChangeText={(v) => onEditChange('longueurFesse', v)} keyboardType="numeric" />
                </>
              ) : null}

              {editFormData?.sexe === 'Femme' && String(editFormData?.typeVetement || '').toLowerCase() === 'jupe' ? (
                <>
                  <TextInput style={styles.input} placeholder="Épaule" value={String(editFormData?.epaule || '')} onChangeText={(v) => onEditChange('epaule', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Manche" value={String(editFormData?.manche || '')} onChangeText={(v) => onEditChange('manche', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Poitrine" value={String(editFormData?.poitrine || '')} onChangeText={(v) => onEditChange('poitrine', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Taille" value={String(editFormData?.taille || '')} onChangeText={(v) => onEditChange('taille', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Longueur" value={String(editFormData?.longueur || '')} onChangeText={(v) => onEditChange('longueur', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Longueur jupe" value={String(editFormData?.longueurJupe || '')} onChangeText={(v) => onEditChange('longueurJupe', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Ceinture" value={String(editFormData?.ceinture || '')} onChangeText={(v) => onEditChange('ceinture', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Fesse" value={String(editFormData?.fesse || '')} onChangeText={(v) => onEditChange('fesse', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Tour manche" value={String(editFormData?.tourManche || '')} onChangeText={(v) => onEditChange('tourManche', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Longueur poitrine" value={String(editFormData?.longueurPoitrine || '')} onChangeText={(v) => onEditChange('longueurPoitrine', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Longueur taille" value={String(editFormData?.longueurTaille || '')} onChangeText={(v) => onEditChange('longueurTaille', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Longueur fesse" value={String(editFormData?.longueurFesse || '')} onChangeText={(v) => onEditChange('longueurFesse', v)} keyboardType="numeric" />
                </>
              ) : null}

              {editFormData?.sexe === 'Homme' ? (
                <>
                  <TextInput style={styles.input} placeholder="Épaule" value={String(editFormData?.epaule || '')} onChangeText={(v) => onEditChange('epaule', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Manche" value={String(editFormData?.manche || '')} onChangeText={(v) => onEditChange('manche', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Longueur" value={String(editFormData?.longueur || '')} onChangeText={(v) => onEditChange('longueur', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Longueur pantalon" value={String(editFormData?.longueurPantalon || '')} onChangeText={(v) => onEditChange('longueurPantalon', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Ceinture" value={String(editFormData?.ceinture || '')} onChangeText={(v) => onEditChange('ceinture', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Cuisse" value={String(editFormData?.cuisse || '')} onChangeText={(v) => onEditChange('cuisse', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Poitrine" value={String(editFormData?.poitrine || '')} onChangeText={(v) => onEditChange('poitrine', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Coude / Corps" value={String(editFormData?.corps || '')} onChangeText={(v) => onEditChange('corps', v)} keyboardType="numeric" />
                  <TextInput style={styles.input} placeholder="Tour manche" value={String(editFormData?.tourManche || '')} onChangeText={(v) => onEditChange('tourManche', v)} keyboardType="numeric" />
                </>
              ) : null}

              <TouchableOpacity style={styles.saveBtn} onPress={saveClientEdit} disabled={savingEdit}>
                <Text style={styles.saveBtnText}>{savingEdit ? 'Enregistrement...' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 44,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f3f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: { width: 36, height: 36 },
  backBtnText: { fontSize: 20, color: '#111', fontWeight: '700' },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '700' },
  addBtn: { backgroundColor: '#0d6efd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#eef2f7',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  name: { fontSize: 15 },
  small: { color: '#666' },
  actionsLabel: { marginTop: 8, marginBottom: 6, fontSize: 12, fontWeight: '700', color: '#475569' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { width: '32%', borderRadius: 7, paddingVertical: 8, alignItems: 'center' },
  infoBtn: { backgroundColor: '#0d6efd' },
  warnBtn: { backgroundColor: '#f59f00' },
  dangerBtn: { backgroundColor: '#dc3545' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  detailTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  detailLine: { fontSize: 14, color: '#333', marginBottom: 6 },
  detailPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f1f3f5',
  },
  sep: { borderBottomWidth: 1, borderBottomColor: '#eee', marginVertical: 10 },
  editPhoto: {
    width: '100%',
    height: 170,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#eef2f7',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: '#198754',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  noPermissionBox: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffe69c',
    marginBottom: 12,
  },
  noPermissionText: { color: '#7a5d00', fontWeight: '600' },
});
