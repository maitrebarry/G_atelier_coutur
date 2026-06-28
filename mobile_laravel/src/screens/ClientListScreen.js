import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, ScrollView,
  Alert, TextInput, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, BottomBar } from '../components/MobileShell';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATUS_META = {
  PAYE:       { label: 'Soldé',      color: '#198754', bg: '#eafaf1' },
  PARTIEL:    { label: 'Partiel',    color: '#f59f00', bg: '#fff7e6' },
  EN_ATTENTE: { label: 'En attente', color: '#dc3545', bg: '#fdecee' },
};

export default function ClientListScreen({ navigation }) {
  const [clients, setClients]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState('');
  const [selectedClient, setSelectedClient]   = useState(null);
  const [selectedMesureIdx, setSelectedMesureIdx] = useState(0);
  const [editingClient, setEditingClient]     = useState(null);
  const [editFormData, setEditFormData]       = useState(null);
  const [savingEdit, setSavingEdit]           = useState(false);
  const [photoPreview, setPhotoPreview]       = useState(null);
  const [habitPhotoPreview, setHabitPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile]             = useState(null);
  const [habitPhotoFile, setHabitPhotoFile]   = useState(null);
  const [habitPhotoCleared, setHabitPhotoCleared] = useState(false);
  const [userData, setUserData]               = useState(null);

  const role = (userData?.role || '').toUpperCase();
  const userPermissions = Array.isArray(userData?.permissions)
    ? userData.permissions.map((p) => (typeof p === 'string' ? p : p?.code)).filter(Boolean)
    : [];
  const hasPermission = (code) => {
    if (!code) return true;
    if (['SUPERADMIN', 'PROPRIETAIRE'].includes(role)) return true;
    return userPermissions.includes(code);
  };
  const canViewClients   = hasPermission('CLIENT_VOIR');
  const canEditClients   = role !== 'TAILLEUR' && hasPermission('CLIENT_MODIFIER');
  const canDeleteClients = role !== 'TAILLEUR' && hasPermission('CLIENT_SUPPRIMER');

  const apiBase = useMemo(() => (api?.defaults?.baseURL || '').replace(/\/?api\/?$/i, ''), []);

  const buildPhotoUrl = (path, folder) => {
    if (!path) return null;
    if (String(path).startsWith('http')) return path;
    const clean = String(path).replace(/^\/+/, '').replace(`${folder}/`, '');
    return apiBase ? `${apiBase}/${folder}/${clean}` : null;
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        (c.nom || '').toLowerCase().includes(q) ||
        (c.prenom || '').toLowerCase().includes(q) ||
        (c.contact || '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  const fetchClients = async ({ silent = false } = {}) => {
    if (userData && !canViewClients) { setClients([]); setLoading(false); setRefreshing(false); return; }
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/clients');
      setClients(res.data || []);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les clients');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('userData').then((raw) => setUserData(raw ? JSON.parse(raw) : null)).catch(() => setUserData(null));
  }, []);

  useEffect(() => { fetchClients(); }, [userData]);

  const openClientDetails = async (id) => {
    try {
      const res = await api.get(`/clients/${id}`);
      setSelectedClient(res.data || null);
      setSelectedMesureIdx(0);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les détails');
    }
  };

  const openEditClient = async (id) => {
    try {
      const res = await api.get(`/clients/${id}`);
      const c = res.data || {};
      const m = c?.mesures?.[0] || {};
      setEditingClient(c);
      setEditFormData({
        nom: c.nom || '', prenom: c.prenom || '', contact: c.contact || '',
        adresse: c.adresse || '', email: c.email || '',
        sexe: m.sexe || 'Femme', typeVetement: m.typeVetement || 'robe',
        modeleNom: m.modeleNom || '',
        prix: String(m.prix || ''), description: m.description || '',
        epaule: m.epaule || '', manche: m.manche || '', poitrine: m.poitrine || '',
        taille: m.taille || '', longueur: m.longueur || '', fesse: m.fesse || '',
        tourManche: m.tourManche || '', longueurPoitrine: m.longueurPoitrine || '',
        longueurTaille: m.longueurTaille || '', longueurFesse: m.longueurFesse || '',
        longueurJupe: m.longueurJupe || '', ceinture: m.ceinture || '',
        longueurPantalon: m.longueurPantalon || '', cuisse: m.cuisse || '', corps: m.corps || '',
      });
      setPhotoPreview(buildPhotoUrl(m.photoPath, 'model_photo'));
      setHabitPhotoPreview(buildPhotoUrl(m.habitPhotoPath, 'habit_photo'));
      setPhotoFile(null); setHabitPhotoFile(null); setHabitPhotoCleared(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les données');
    }
  };

  const handleDeleteClient = (id) => {
    Alert.alert('Suppression', 'Supprimer ce client définitivement ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/clients/${id}`);
            await fetchClients({ silent: true });
            Alert.alert('Succès', 'Client supprimé');
          } catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
        },
      },
    ]);
  };

  const pickOrTakePhoto = async (source, target) => {
    try {
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission refusée', 'Autorisez la caméra.'); return; }
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission refusée', 'Autorisez la galerie.'); return; }
        const imgType = ImagePicker?.MediaType?.images || ImagePicker?.MediaType?.Images || 'images';
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [imgType], allowsEditing: true, quality: 0.85 });
      }
      if (result.canceled) return;
      const asset = result.assets?.[0];
      const file = { uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || `${target}.jpg` };
      if (target === 'photo') { setPhotoFile(file); setPhotoPreview(asset.uri); }
      else { setHabitPhotoFile(file); setHabitPhotoPreview(asset.uri); setHabitPhotoCleared(false); }
    } catch { Alert.alert('Erreur', 'Impossible d\'ouvrir la caméra/galerie.'); }
  };

  const saveClientEdit = async () => {
    if (!editingClient || !editFormData) return;
    if (!editFormData.nom || !editFormData.prenom || !editFormData.contact) {
      Alert.alert('Erreur', 'Nom, prénom et contact sont requis'); return;
    }
    try {
      setSavingEdit(true);
      const data = new FormData();
      ['nom', 'prenom', 'contact', 'adresse', 'email', 'sexe', 'prix', 'description', 'modeleNom'].forEach((k) =>
        data.append(k, String(editFormData[k] || ''))
      );
      if (photoFile?.uri) data.append('photo', photoFile);
      else if (editingClient?.mesures?.[0]?.photoPath) data.append('existing_photo', editingClient.mesures[0].photoPath);
      if (habitPhotoFile?.uri) data.append('habitPhoto', habitPhotoFile);
      else if (!habitPhotoCleared && editingClient?.mesures?.[0]?.habitPhotoPath) data.append('existing_habit_photo', editingClient.mesures[0].habitPhotoPath);

      const t = String(editFormData.typeVetement || 'robe').toLowerCase();
      if (editFormData.sexe === 'Femme') {
        data.append('femme_type_edit', t);
        const fields = t === 'robe'
          ? ['epaule', 'manche', 'poitrine', 'taille', 'longueur', 'fesse', 'tourManche', 'longueurPoitrine', 'longueurTaille', 'longueurFesse']
          : ['epaule', 'manche', 'poitrine', 'taille', 'longueur', 'longueurJupe', 'ceinture', 'fesse', 'tourManche', 'longueurPoitrine', 'longueurTaille', 'longueurFesse'];
        fields.forEach((f) => data.append(`${t}_${f}`, String(editFormData[f] || '')));
      } else {
        ['epaule', 'manche', 'longueur', 'longueurPantalon', 'ceinture', 'cuisse', 'poitrine', 'corps', 'tourManche']
          .forEach((f) => data.append(`homme_${f}`, String(editFormData[f] || '')));
      }

      await api.put(`/clients/${editingClient.id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditingClient(null); setEditFormData(null);
      await fetchClients({ silent: true });
      Alert.alert('Succès', 'Client modifié');
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de modifier');
    } finally { setSavingEdit(false); }
  };

  const onEditChange = (name, value) => setEditFormData((prev) => ({ ...prev, [name]: value }));

  const renderMesureDetail = (mesure) => {
    if (!mesure) return null;
    const line = (label, val) => val ? (
      <View key={label} style={styles.mesureRow}>
        <Text style={styles.mesureLabel}>{label}</Text>
        <Text style={styles.mesureVal}>{String(val)}</Text>
      </View>
    ) : null;

    const femFields = mesure.typeVetement?.toLowerCase() === 'jupe'
      ? [['Épaule', mesure.epaule], ['Manche', mesure.manche], ['Poitrine', mesure.poitrine], ['Taille', mesure.taille], ['Longueur', mesure.longueur], ['Longueur jupe', mesure.longueurJupe], ['Ceinture', mesure.ceinture], ['Fesse', mesure.fesse], ['Tour manche', mesure.tourManche], ['Long. poitrine', mesure.longueurPoitrine], ['Long. taille', mesure.longueurTaille], ['Long. fesse', mesure.longueurFesse]]
      : [['Épaule', mesure.epaule], ['Manche', mesure.manche], ['Poitrine', mesure.poitrine], ['Taille', mesure.taille], ['Longueur', mesure.longueur], ['Fesse', mesure.fesse], ['Tour manche', mesure.tourManche], ['Long. poitrine', mesure.longueurPoitrine], ['Long. taille', mesure.longueurTaille], ['Long. fesse', mesure.longueurFesse]];
    const homFields = [['Épaule', mesure.epaule], ['Manche', mesure.manche], ['Longueur', mesure.longueur], ['Long. pantalon', mesure.longueurPantalon], ['Ceinture', mesure.ceinture], ['Cuisse', mesure.cuisse], ['Poitrine', mesure.poitrine], ['Cou', mesure.corps], ['Tour manche', mesure.tourManche]];

    return (mesure.sexe === 'Homme' ? homFields : femFields).map(([l, v]) => line(l, v));
  };

  const mesuresCount = selectedClient?.mesures?.length || 0;
  const currentMesure = selectedClient?.mesures?.[selectedMesureIdx] || null;

  const renderItem = ({ item }) => {
    const s = STATUS_META[item.statutPaiement] || STATUS_META.EN_ATTENTE;
    const pct = item.montantTotal > 0 ? Math.min(100, Math.round((item.montantPaye / item.montantTotal) * 100)) : 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.prenom || ''} {item.nom || ''}</Text>
            <Text style={styles.cardSub}>{item.contact || item.email || '—'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={[styles.statusChip, { borderColor: s.color, backgroundColor: s.bg }]}>
              <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
            </View>
            <View style={styles.mesureBadge}>
              <Ionicons name="shirt-outline" size={11} color="#0d6efd" />
              <Text style={styles.mesureBadgeText}>{item.nbMesures || 0} modèle(s)</Text>
            </View>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <Text style={styles.metric}>Total: <Text style={styles.metricVal}>{Number(item.montantTotal || 0).toLocaleString('fr-FR')} FCFA</Text></Text>
          <Text style={styles.metric}>Payé: <Text style={[styles.metricVal, { color: '#198754' }]}>{Number(item.montantPaye || 0).toLocaleString('fr-FR')} FCFA</Text></Text>
          <Text style={styles.metric}>Reste: <Text style={[styles.metricVal, { color: '#dc3545' }]}>{Number(item.resteAPayer || 0).toLocaleString('fr-FR')} FCFA</Text></Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.pctText}>{pct}% réglé</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={() => openClientDetails(item.id)}>
            <Ionicons name="eye-outline" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Détail</Text>
          </TouchableOpacity>
          {canEditClients ? (
            <TouchableOpacity style={[styles.actionBtn, styles.warnBtn]} onPress={() => openEditClient(item.id)}>
              <Ionicons name="create-outline" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Modifier</Text>
            </TouchableOpacity>
          ) : null}
          {canDeleteClients ? (
            <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => handleDeleteClient(item.id)}>
              <Ionicons name="trash-outline" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Supprimer</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader navigation={navigation} title="Clients" subtitle="Carnet de l'atelier" showBack />

      <View style={styles.topRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, contact…"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {canEditClients ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('MesureAdd')}>
            <Ionicons name="person-add-outline" size={16} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      {!canViewClients ? (
        <View style={styles.noPermBox}><Text style={styles.noPermText}>Vous n'avez pas la permission de voir les clients.</Text></View>
      ) : null}

      {loading && canViewClients ? <ActivityIndicator style={{ margin: 10 }} /> : null}

      {canViewClients ? (
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchClients({ silent: true }); }} />}
          ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Aucun client trouvé</Text> : null}
        />
      ) : null}

      {/* ── Modale DÉTAIL ── */}
      <Modal visible={!!selectedClient} transparent animationType="slide" onRequestClose={() => setSelectedClient(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedClient?.prenom || ''} {selectedClient?.nom || ''}</Text>
              <TouchableOpacity onPress={() => setSelectedClient(null)}>
                <Ionicons name="close" size={22} color="#dc3545" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Infos client */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLine}><Text style={styles.infoLbl}>Contact : </Text>{selectedClient?.contact || '—'}</Text>
                <Text style={styles.infoLine}><Text style={styles.infoLbl}>Email : </Text>{selectedClient?.email || '—'}</Text>
                <Text style={styles.infoLine}><Text style={styles.infoLbl}>Adresse : </Text>{selectedClient?.adresse || '—'}</Text>
              </View>

              {/* Bilan paiements */}
              <View style={styles.bilanRow}>
                <View style={styles.bilanCell}>
                  <Text style={styles.bilanNum}>{Number(selectedClient?.montantTotal || 0).toLocaleString('fr-FR')}</Text>
                  <Text style={styles.bilanLbl}>Total FCFA</Text>
                </View>
                <View style={styles.bilanCell}>
                  <Text style={[styles.bilanNum, { color: '#198754' }]}>{Number(selectedClient?.montantPaye || 0).toLocaleString('fr-FR')}</Text>
                  <Text style={styles.bilanLbl}>Payé FCFA</Text>
                </View>
                <View style={styles.bilanCell}>
                  <Text style={[styles.bilanNum, { color: '#dc3545' }]}>{Number(selectedClient?.resteAPayer || 0).toLocaleString('fr-FR')}</Text>
                  <Text style={styles.bilanLbl}>Reste FCFA</Text>
                </View>
              </View>

              {/* Sélecteur de mesure */}
              {mesuresCount > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mesureTabsRow}>
                  {selectedClient.mesures.map((m, i) => (
                    <TouchableOpacity
                      key={String(m.id)}
                      style={[styles.mesureTab, selectedMesureIdx === i && styles.mesureTabActive]}
                      onPress={() => setSelectedMesureIdx(i)}
                    >
                      <Text style={[styles.mesureTabText, selectedMesureIdx === i && styles.mesureTabTextActive]}>
                        {m.modeleNom || m.typeVetement || `Modèle ${i + 1}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}

              {/* Détail mesure sélectionnée */}
              {currentMesure ? (
                <View style={styles.mesureCard}>
                  <View style={styles.mesureCardHeader}>
                    <Text style={styles.detailTitle}>
                      {currentMesure.modeleNom || currentMesure.typeVetement || 'Modèle'}
                    </Text>
                    <Text style={styles.mesureType}>{currentMesure.sexe} — {currentMesure.typeVetement}</Text>
                  </View>

                  {buildPhotoUrl(currentMesure.photoPath, 'model_photo') ? (
                    <Image source={{ uri: buildPhotoUrl(currentMesure.photoPath, 'model_photo') }} style={styles.detailPhoto} />
                  ) : null}

                  <View style={styles.mesureInfoRow}>
                    <Text style={styles.prixText}>{Number(currentMesure.prix || 0).toLocaleString('fr-FR')} FCFA</Text>
                    {currentMesure.description ? <Text style={styles.descText}>{currentMesure.description}</Text> : null}
                  </View>

                  <View style={styles.mesureGrid}>
                    {renderMesureDetail(currentMesure)}
                  </View>

                  {buildPhotoUrl(currentMesure.habitPhotoPath, 'habit_photo') ? (
                    <>
                      <Text style={[styles.detailTitle, { marginTop: 10 }]}>Photo de l'habit</Text>
                      <Image source={{ uri: buildPhotoUrl(currentMesure.habitPhotoPath, 'habit_photo') }} style={styles.detailPhoto} />
                    </>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.emptyText}>Aucune mesure enregistrée</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modale MODIFICATION ── */}
      <Modal visible={!!editingClient && canEditClients} transparent animationType="slide"
        onRequestClose={() => { setEditingClient(null); setEditFormData(null); }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier client</Text>
              <TouchableOpacity onPress={() => { setEditingClient(null); setEditFormData(null); }}>
                <Ionicons name="close" size={22} color="#dc3545" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Photos */}
              {photoPreview ? <Image source={{ uri: photoPreview }} style={styles.editPhoto} /> : null}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={() => pickOrTakePhoto('camera', 'photo')}><Text style={styles.actionBtnText}>📷 Modèle</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={() => pickOrTakePhoto('gallery', 'photo')}><Text style={styles.actionBtnText}>🖼 Galerie</Text></TouchableOpacity>
              </View>
              {habitPhotoPreview ? <Image source={{ uri: habitPhotoPreview }} style={styles.editPhoto} /> : null}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={() => pickOrTakePhoto('camera', 'habit')}><Text style={styles.actionBtnText}>📷 Habit</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={() => pickOrTakePhoto('gallery', 'habit')}><Text style={styles.actionBtnText}>🖼 Galerie</Text></TouchableOpacity>
                {habitPhotoPreview ? (
                  <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => { setHabitPhotoFile(null); setHabitPhotoPreview(null); setHabitPhotoCleared(true); }}>
                    <Text style={styles.actionBtnText}>Effacer</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Infos client */}
              <Text style={styles.sectionLabel}>Informations client</Text>
              <TextInput style={styles.input} placeholder="Nom *" value={editFormData?.nom || ''} onChangeText={(v) => onEditChange('nom', v)} />
              <TextInput style={styles.input} placeholder="Prénom *" value={editFormData?.prenom || ''} onChangeText={(v) => onEditChange('prenom', v)} />
              <TextInput style={styles.input} placeholder="Contact *" value={editFormData?.contact || ''} onChangeText={(v) => onEditChange('contact', v)} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="Adresse" value={editFormData?.adresse || ''} onChangeText={(v) => onEditChange('adresse', v)} />
              <TextInput style={styles.input} placeholder="Email" value={editFormData?.email || ''} onChangeText={(v) => onEditChange('email', v)} keyboardType="email-address" />

              {/* Modèle */}
              <Text style={styles.sectionLabel}>Modèle / Mesures</Text>
              <TextInput style={styles.input} placeholder="Nom du modèle (ex: Grand boubou)" value={editFormData?.modeleNom || ''} onChangeText={(v) => onEditChange('modeleNom', v)} />

              <View style={styles.actionsRow}>
                {['Femme', 'Homme'].map((s) => (
                  <TouchableOpacity key={s} style={[styles.actionBtn, editFormData?.sexe === s ? styles.infoBtn : styles.warnBtn]} onPress={() => onEditChange('sexe', s)}>
                    <Text style={styles.actionBtnText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {editFormData?.sexe === 'Femme' ? (
                <View style={styles.actionsRow}>
                  {['robe', 'jupe'].map((t) => (
                    <TouchableOpacity key={t} style={[styles.actionBtn, String(editFormData?.typeVetement || '').toLowerCase() === t ? styles.infoBtn : styles.warnBtn]} onPress={() => onEditChange('typeVetement', t)}>
                      <Text style={styles.actionBtnText}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <TextInput style={styles.input} placeholder="Prix (FCFA)" value={editFormData?.prix || ''} onChangeText={(v) => onEditChange('prix', v)} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Description" value={editFormData?.description || ''} onChangeText={(v) => onEditChange('description', v)} />

              {editFormData?.sexe === 'Femme' && String(editFormData?.typeVetement || '').toLowerCase() === 'robe' ? (
                ['epaule:Épaule', 'manche:Manche', 'poitrine:Poitrine', 'taille:Taille', 'longueur:Longueur', 'fesse:Fesse', 'tourManche:Tour manche', 'longueurPoitrine:Long. poitrine', 'longueurTaille:Long. taille', 'longueurFesse:Long. fesse'].map((x) => {
                  const [f, p] = x.split(':');
                  return <TextInput key={f} style={styles.input} placeholder={p} value={String(editFormData?.[f] || '')} onChangeText={(v) => onEditChange(f, v)} keyboardType="numeric" />;
                })
              ) : null}

              {editFormData?.sexe === 'Femme' && String(editFormData?.typeVetement || '').toLowerCase() === 'jupe' ? (
                ['epaule:Épaule', 'manche:Manche', 'poitrine:Poitrine', 'taille:Taille', 'longueur:Longueur', 'longueurJupe:Long. jupe', 'ceinture:Ceinture', 'fesse:Fesse', 'tourManche:Tour manche', 'longueurPoitrine:Long. poitrine', 'longueurTaille:Long. taille', 'longueurFesse:Long. fesse'].map((x) => {
                  const [f, p] = x.split(':');
                  return <TextInput key={f} style={styles.input} placeholder={p} value={String(editFormData?.[f] || '')} onChangeText={(v) => onEditChange(f, v)} keyboardType="numeric" />;
                })
              ) : null}

              {editFormData?.sexe === 'Homme' ? (
                ['epaule:Épaule', 'manche:Manche', 'longueur:Longueur', 'longueurPantalon:Long. pantalon', 'ceinture:Ceinture', 'cuisse:Cuisse', 'poitrine:Poitrine', 'corps:Cou', 'tourManche:Tour manche'].map((x) => {
                  const [f, p] = x.split(':');
                  return <TextInput key={f} style={styles.input} placeholder={p} value={String(editFormData?.[f] || '')} onChangeText={(v) => onEditChange(f, v)} keyboardType="numeric" />;
                })
              ) : null}

              <TouchableOpacity style={styles.saveBtn} onPress={saveClientEdit} disabled={savingEdit}>
                <Text style={styles.saveBtnText}>{savingEdit ? 'Enregistrement…' : 'Enregistrer les modifications'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BottomBar navigation={navigation} active="Clients" />
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f4f6fb' },
  topRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  searchInput:   { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe2ef', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  addBtn:        { backgroundColor: '#0d6efd', borderRadius: 10, padding: 10 },
  emptyText:     { textAlign: 'center', color: '#66758f', marginTop: 20, fontSize: 14 },
  noPermBox:     { margin: 14, padding: 14, backgroundColor: '#fff3cd', borderRadius: 8, borderWidth: 1, borderColor: '#ffe69c' },
  noPermText:    { color: '#7a5d00', fontWeight: '600' },

  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5eaf3', borderRadius: 12, marginBottom: 10, padding: 12 },
  cardHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardName:      { fontSize: 15, fontWeight: '800', color: '#1d2c4d' },
  cardSub:       { fontSize: 12, color: '#66758f', marginTop: 2 },
  statusChip:    { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:    { fontSize: 11, fontWeight: '700' },
  mesureBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#eef4ff', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  mesureBadgeText: { fontSize: 11, color: '#0d6efd', fontWeight: '600' },
  metricsRow:    { marginBottom: 6 },
  metric:        { fontSize: 12, color: '#4f5f80', marginBottom: 2 },
  metricVal:     { fontWeight: '700', color: '#1d2c4d' },
  progressTrack: { height: 5, backgroundColor: '#e9edf5', borderRadius: 999, overflow: 'hidden', marginBottom: 2 },
  progressFill:  { height: 5, borderRadius: 999, backgroundColor: '#0d6efd' },
  pctText:       { fontSize: 11, color: '#64708b', textAlign: 'right', marginBottom: 8 },
  actionsRow:    { flexDirection: 'row', gap: 6 },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 7, paddingVertical: 8 },
  infoBtn:       { backgroundColor: '#0d6efd' },
  warnBtn:       { backgroundColor: '#f59f00' },
  dangerBtn:     { backgroundColor: '#dc3545' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 14 },
  modalCard:     { backgroundColor: '#fff', borderRadius: 14, padding: 14, maxHeight: '88%' },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle:    { fontSize: 17, fontWeight: '800', color: '#1d2c4d', flex: 1, marginRight: 8 },

  infoSection:   { backgroundColor: '#f8faff', borderRadius: 8, padding: 10, marginBottom: 10 },
  infoLine:      { fontSize: 13, color: '#333', marginBottom: 4 },
  infoLbl:       { fontWeight: '700', color: '#475569' },

  bilanRow:      { flexDirection: 'row', gap: 6, marginBottom: 12 },
  bilanCell:     { flex: 1, backgroundColor: '#f4f6fb', borderRadius: 8, padding: 8, alignItems: 'center' },
  bilanNum:      { fontSize: 14, fontWeight: '900', color: '#1d2c4d' },
  bilanLbl:      { fontSize: 10, color: '#66758f', marginTop: 2 },

  mesureTabsRow: { gap: 6, paddingVertical: 4, marginBottom: 8 },
  mesureTab:     { borderWidth: 1, borderColor: '#dbe2ef', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  mesureTabActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  mesureTabText: { fontSize: 12, color: '#2b3c62', fontWeight: '600' },
  mesureTabTextActive: { color: '#fff' },

  mesureCard:    { backgroundColor: '#f8faff', borderRadius: 10, padding: 12, marginBottom: 10 },
  mesureCardHeader: { marginBottom: 8 },
  detailTitle:   { fontSize: 15, fontWeight: '800', color: '#1d2c4d' },
  mesureType:    { fontSize: 12, color: '#66758f', marginTop: 2 },
  detailPhoto:   { width: '100%', height: 180, borderRadius: 10, marginBottom: 10, backgroundColor: '#eef2f7' },
  mesureInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  prixText:      { fontSize: 15, fontWeight: '900', color: '#0d6efd' },
  descText:      { fontSize: 12, color: '#66758f', flex: 1, marginLeft: 8 },
  mesureGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  mesureRow:     { flexDirection: 'row', justifyContent: 'space-between', width: '48%', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  mesureLabel:   { fontSize: 11, color: '#66758f', flex: 1 },
  mesureVal:     { fontSize: 11, fontWeight: '700', color: '#1d2c4d' },

  sectionLabel:  { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 10, marginBottom: 6 },
  input:         { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 8, backgroundColor: '#fff', fontSize: 14 },
  editPhoto:     { width: '100%', height: 150, borderRadius: 10, marginBottom: 8, backgroundColor: '#eef2f7' },
  saveBtn:       { marginTop: 8, backgroundColor: '#198754', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  saveBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
});
