import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/backend';

const STATUTS = ['', 'EN_ATTENTE', 'EN_COURS', 'TERMINE', 'VALIDE'];

const getStatusMeta = (statut) => {
  const map = {
    EN_ATTENTE: { label: 'En attente', color: '#f59f00', bg: '#fff7e6', progress: 10 },
    EN_COURS: { label: 'En cours', color: '#0dcaf0', bg: '#e8faff', progress: 50 },
    TERMINE: { label: 'Terminé', color: '#198754', bg: '#eafaf1', progress: 90 },
    VALIDE: { label: 'Validé', color: '#0d6efd', bg: '#ebf3ff', progress: 100 },
    ANNULE: { label: 'Annulé', color: '#dc3545', bg: '#fdecee', progress: 0 },
  };
  return map[statut] || { label: statut || 'Inconnu', color: '#6c757d', bg: '#f2f4f7', progress: 0 };
};

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function AffectationScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [userData, setUserData] = useState(null);
  const [atelierId, setAtelierId] = useState('');
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('');

  const [tailleurs, setTailleurs] = useState([]);
  const [clients, setClients] = useState([]);
  const [affectations, setAffectations] = useState([]);

  const [tailleurId, setTailleurId] = useState('');
  const [dateEcheance, setDateEcheance] = useState(tomorrow());
  const [selectedClients, setSelectedClients] = useState(new Map());

  const [searchClient, setSearchClient] = useState('');
  const [typeVetementFilter, setTypeVetementFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tailleurFilter, setTailleurFilter] = useState('');
  const [showRdvModal, setShowRdvModal] = useState(false);
  const [rdvTarget, setRdvTarget] = useState(null);
  const [rdvSaving, setRdvSaving] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [rdvForm, setRdvForm] = useState({
    date: tomorrow(),
    heure: '10:00',
    motif: 'Livraison',
    notes: '',
  });

  const role = (userRole || '').toUpperCase();
  const permissions = Array.isArray(userData?.permissions)
    ? userData.permissions.map((p) => (typeof p === 'string' ? p : p?.code)).filter(Boolean)
    : [];

  const hasPermission = (code) => {
    if (!code) return true;
    if (['SUPERADMIN', 'PROPRIETAIRE'].includes(role)) return true;
    return permissions.includes(code);
  };

  const canView = hasPermission('AFFECTATION_VOIR');
  const canCreate = (['PROPRIETAIRE', 'SECRETAIRE'].includes(role) || hasPermission('AFFECTATION_CREER')) && hasPermission('AFFECTATION_VOIR');
  const canCancel = ['PROPRIETAIRE', 'SECRETAIRE', 'SUPERADMIN'].includes(role) || hasPermission('AFFECTATION_SUPPRIMER');

  const getAffectationDueDate = useCallback((aff) => (
    aff?.dateEcheance || aff?.date_echeance || aff?.dateLimite || aff?.date_limite || null
  ), []);

  const isAffectationOverdue = useCallback((aff) => {
    const dueDate = getAffectationDueDate(aff);
    if (!dueDate) return false;

    const statut = String(aff?.statut || '').toUpperCase();
    if (['ANNULE', 'TERMINE', 'VALIDE'].includes(statut)) return false;

    const deadline = new Date(dueDate);
    if (Number.isNaN(deadline.getTime())) return false;

    deadline.setHours(23, 59, 59, 999);
    return deadline.getTime() < Date.now();
  }, [getAffectationDueDate]);

  const headers = useMemo(
    () => ({
      'X-User-Id': userId,
      'X-User-Role': role,
    }),
    [userId, role]
  );

  const loadContext = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      const u = raw ? JSON.parse(raw) : null;
      setUserData(u);
      setAtelierId(String(u?.atelierId || u?.atelier?.id || ''));
      setUserId(String(u?.userId || u?.id || ''));
      setUserRole(String(u?.role || ''));
    } catch (e) {
      setUserData(null);
    }
  }, []);

  const loadFormData = useCallback(async () => {
    if (!atelierId || !canCreate) return;
    try {
      const res = await api.get(`/affectations/formulaire-data?atelierId=${atelierId}`);
      const data = res?.data?.data || {};
      setTailleurs(Array.isArray(data.tailleurs) ? data.tailleurs : []);
      setClients(Array.isArray(data.clients) ? data.clients : []);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les données de formulaire.');
    }
  }, [atelierId, canCreate]);

  const loadAffectations = useCallback(async ({ silent = false } = {}) => {
    if (!atelierId || !userId || !role || !canView) {
      setAffectations([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      let url = `/affectations?atelierId=${atelierId}`;
      if (statusFilter) url += `&statut=${statusFilter}`;
      if (tailleurFilter) url += `&tailleurId=${tailleurFilter}`;
      const res = await api.get(url, { headers });
      setAffectations(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les affectations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [atelierId, userId, role, canView, statusFilter, tailleurFilter, headers]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  useEffect(() => {
    const incomingOverdue = route?.params?.overdueOnly === true;
    setOverdueOnly(incomingOverdue);
    if (incomingOverdue) {
      setStatusFilter('');
    }
  }, [route?.params?.overdueOnly]);

  useEffect(() => {
    loadFormData();
    loadAffectations();
  }, [loadFormData, loadAffectations]);

  const filteredClients = useMemo(() => {
    const q = searchClient.trim().toLowerCase();
    return clients.filter((c) => {
      const full = `${c?.prenom || ''} ${c?.nom || ''}`.toLowerCase();
      const bySearch = !q || full.includes(q);
      const mesures = Array.isArray(c?.mesures) ? c.mesures : [];
      const hasMeasures = mesures.length > 0;
      const byType =
        !typeVetementFilter ||
        mesures.some((m) => String(m?.typeVetement || '').toUpperCase() === typeVetementFilter);
      return bySearch && byType && hasMeasures;
    });
  }, [clients, searchClient, typeVetementFilter]);

  const toggleClient = (client) => {
    const next = new Map(selectedClients);
    if (next.has(client.id)) {
      next.delete(client.id);
    } else {
      const m = Array.isArray(client?.mesures) ? client.mesures[0] : null;
      if (!m?.id) {
        Alert.alert('Info', 'Aucune mesure valide pour ce client.');
        return;
      }
      next.set(client.id, {
        clientId: client.id,
        mesureId: m.id,
        prixTailleur: 5000,
      });
    }
    setSelectedClients(next);
  };

  const updateSelectedPrice = (clientId, value) => {
    const next = new Map(selectedClients);
    const item = next.get(clientId);
    if (!item) return;
    item.prixTailleur = Number(value) || 0;
    next.set(clientId, item);
    setSelectedClients(next);
  };

  const submitCreate = async () => {
    if (!tailleurId) {
      Alert.alert('Validation', 'Sélectionnez un tailleur.');
      return;
    }
    if (selectedClients.size === 0) {
      Alert.alert('Validation', 'Sélectionnez au moins un client.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        tailleurId,
        dateEcheance: dateEcheance || null,
        affectations: Array.from(selectedClients.values()),
      };
      await api.post(`/affectations?atelierId=${atelierId}`, payload, {
        headers: { 'X-User-Id': userId },
      });
      setSelectedClients(new Map());
      setTailleurId('');
      await loadFormData();
      await loadAffectations({ silent: true });
      Alert.alert('Succès', 'Affectation créée avec succès.');
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || e?.response?.data?.error || 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = (aff, statut) => {
    Alert.alert('Confirmation', `Passer à ${statut} ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        onPress: async () => {
          try {
            await api.patch(`/affectations/${aff.id}/statut`, { statut }, { headers });
            await loadAffectations({ silent: true });
            if (statut === 'VALIDE') {
              openRdvModal(aff);
            } else {
              Alert.alert('Succès', 'Statut mis à jour.');
            }
          } catch (e) {
            Alert.alert('Erreur', 'Impossible de modifier le statut.');
          }
        },
      },
    ]);
  };

  const openRdvModal = (affectation) => {
    const defaultNotes = affectation?.mesure?.typeVetement
      ? `Retrait ${affectation.mesure.typeVetement}`
      : '';
    setRdvTarget({
      clientId: affectation?.client?.id,
      clientNom: `${affectation?.client?.prenom || ''} ${affectation?.client?.nom || ''}`.trim(),
      typeVetement: affectation?.mesure?.typeVetement || '',
    });
    setRdvForm({
      date: tomorrow(),
      heure: '10:00',
      motif: 'Livraison',
      notes: defaultNotes,
    });
    setShowRdvModal(true);
  };

  const closeRdvModal = () => {
    setShowRdvModal(false);
    setRdvTarget(null);
    setRdvSaving(false);
  };

  const createRendezvous = async () => {
    if (!rdvTarget?.clientId) {
      Alert.alert('Erreur', 'Client introuvable pour le rendez-vous.');
      return;
    }
    try {
      setRdvSaving(true);
      const dateRDV = `${rdvForm.date}T${rdvForm.heure}`;
      let typeRendezVous = (rdvForm.motif || 'LIVRAISON').toUpperCase();
      if (typeRendezVous === 'ESSAYAGE') typeRendezVous = 'RETOUCHE';
      if (typeRendezVous === 'PRISE DE MESURES') typeRendezVous = 'MESURE';

      await api.post('/rendezvous', {
        clientId: rdvTarget.clientId,
        atelierId,
        dateRDV,
        typeRendezVous,
        notes: rdvForm.notes || '',
      });

      closeRdvModal();
      Alert.alert('Succès', 'Affectation validée et rendez-vous créé.');
      navigation.navigate('Rendezvous');
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de créer le rendez-vous.');
    } finally {
      setRdvSaving(false);
    }
  };

  const cancelAffectation = (id) => {
    Alert.alert('Annulation', 'Confirmer l’annulation de cette affectation ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/affectations/${id}`, { headers });
            await loadAffectations({ silent: true });
            Alert.alert('Succès', 'Affectation annulée.');
          } catch (e) {
            Alert.alert('Erreur', 'Impossible d’annuler cette affectation.');
          }
        },
      },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([loadFormData(), loadAffectations({ silent: true })]).finally(() => setRefreshing(false));
  };

  const displayedAffectations = useMemo(() => {
    return overdueOnly ? affectations.filter(isAffectationOverdue) : affectations;
  }, [overdueOnly, affectations, isAffectationOverdue]);

  const renderAffectation = ({ item }) => (
    <View style={styles.affCard}>
      {(() => {
        const status = getStatusMeta(item?.statut);
        return (
          <>
      <Text style={styles.affTitle}>{item?.client?.prenom} {item?.client?.nom}</Text>
      <Text style={styles.affSub}>Tailleur: {item?.tailleur?.prenom} {item?.tailleur?.nom}</Text>
      <Text style={styles.affSub}>Type: {item?.mesure?.typeVetement || '—'}</Text>
      <View style={styles.affRow}>
        <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.color }]}> 
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
        <Text style={styles.price}>{Number(item?.prixTailleur || 0).toLocaleString('fr-FR')} FCFA</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${status.progress}%`, backgroundColor: status.color }]} />
      </View>
      <Text style={styles.progressLabel}>{status.progress}%</Text>

      <View style={styles.actionsRow}>
        {role === 'TAILLEUR' && item?.statut === 'EN_ATTENTE' ? (
          <TouchableOpacity style={[styles.btn, styles.btnInfo]} onPress={() => changeStatus(item, 'EN_COURS')}>
            <Text style={styles.btnText}>Démarrer</Text>
          </TouchableOpacity>
        ) : null}

        {role === 'TAILLEUR' && item?.statut === 'EN_COURS' ? (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => changeStatus(item, 'TERMINE')}>
            <Text style={styles.btnText}>Terminer</Text>
          </TouchableOpacity>
        ) : null}

        {canCreate && item?.statut === 'TERMINE' ? (
          <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={() => changeStatus(item, 'VALIDE')}>
            <Text style={styles.btnText}>Valider</Text>
          </TouchableOpacity>
        ) : null}

        {canCancel && item?.statut !== 'VALIDE' && item?.statut !== 'ANNULE' ? (
          <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => cancelAffectation(item.id)}>
            <Text style={styles.btnText}>Annuler</Text>
          </TouchableOpacity>
        ) : null}
      </View>
          </>
        );
      })()}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Affectations</Text>
        <View style={{ width: 34 }} />
      </View>

      {!canView ? (
        <View style={styles.noPermissionBox}>
          <Text style={styles.noPermissionText}>Vous n'avez pas la permission de voir les affectations.</Text>
        </View>
      ) : (
        <FlatList
          data={displayedAffectations}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAffectation}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <>
              {canCreate ? (
                <View style={styles.formBox}>
                  <Text style={styles.sectionTitle}>Nouvelle affectation</Text>
                  <Text style={styles.label}>Tailleur</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {tailleurs.map((t) => (
                      <TouchableOpacity
                        key={String(t.id)}
                        style={[styles.chip, tailleurId === String(t.id) && styles.chipActive]}
                        onPress={() => setTailleurId(String(t.id))}
                      >
                        <Text style={[styles.chipText, tailleurId === String(t.id) && styles.chipTextActive]}>{t.prenom} {t.nom}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.label}>Date d'échéance (YYYY-MM-DD)</Text>
                  <TextInput style={styles.input} value={dateEcheance} onChangeText={setDateEcheance} placeholder="2026-03-10" />

                  <Text style={styles.label}>Filtre clients</Text>
                  <TextInput style={styles.input} value={searchClient} onChangeText={setSearchClient} placeholder="Rechercher client..." />

                  <View style={{ marginTop: 8 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {['', 'ROBE', 'JUPE', 'HOMME', 'ENFANT'].map((t) => (
                        <TouchableOpacity
                          key={`tv-${t || 'all'}`}
                          style={[styles.chip, typeVetementFilter === t && styles.chipActive]}
                          onPress={() => setTypeVetementFilter(t)}
                        >
                          <Text style={[styles.chipText, typeVetementFilter === t && styles.chipTextActive]}>{t || 'Tous types'}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <ScrollView style={{ maxHeight: 220, marginTop: 10 }}>
                    {filteredClients.map((c) => {
                      const selected = selectedClients.has(c.id);
                      const s = selectedClients.get(c.id);
                      return (
                        <TouchableOpacity
                          key={String(c.id)}
                          style={[styles.clientRow, selected && styles.clientRowActive]}
                          onPress={() => toggleClient(c)}
                        >
                          <Text style={styles.clientName}>{c.prenom} {c.nom}</Text>
                          <Text style={styles.clientMeta}>{Array.isArray(c.mesures) ? c.mesures.length : 0} mesure(s)</Text>
                          {selected ? (
                            <TextInput
                              style={styles.priceInput}
                              value={String(s?.prixTailleur || '')}
                              onChangeText={(v) => updateSelectedPrice(c.id, v)}
                              keyboardType="numeric"
                              placeholder="Prix tailleur"
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity style={styles.createBtn} onPress={submitCreate} disabled={saving}>
                    <Text style={styles.createBtnText}>{saving ? 'Enregistrement...' : `Confirmer (${selectedClients.size})`}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.formBox}>
                <Text style={styles.sectionTitle}>Liste des affectations</Text>
                {overdueOnly ? (
                  <View style={styles.overdueBanner}>
                    <Text style={styles.overdueBannerText}>Affichage: commandes en retard uniquement</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setOverdueOnly(false);
                        navigation.setParams?.({ overdueOnly: false });
                      }}
                    >
                      <Text style={styles.overdueBannerAction}>Enlever</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <Text style={styles.label}>Statut</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {STATUTS.map((s) => (
                    <TouchableOpacity
                      key={`st-${s || 'all'}`}
                      style={[styles.chip, statusFilter === s && styles.chipActive]}
                      onPress={() => {
                        if (overdueOnly) {
                          setOverdueOnly(false);
                          navigation.setParams?.({ overdueOnly: false });
                        }
                        setStatusFilter(s);
                      }}
                    >
                      <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>{s || 'Tous'}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.label}>Tailleur</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <TouchableOpacity style={[styles.chip, !tailleurFilter && styles.chipActive]} onPress={() => setTailleurFilter('')}>
                    <Text style={[styles.chipText, !tailleurFilter && styles.chipTextActive]}>Tous</Text>
                  </TouchableOpacity>
                  {tailleurs.map((t) => (
                    <TouchableOpacity
                      key={`flt-${t.id}`}
                      style={[styles.chip, tailleurFilter === String(t.id) && styles.chipActive]}
                      onPress={() => setTailleurFilter(String(t.id))}
                    >
                      <Text style={[styles.chipText, tailleurFilter === String(t.id) && styles.chipTextActive]}>{t.prenom}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity style={styles.refreshBtn} onPress={() => loadAffectations()}>
                  <Text style={styles.refreshBtnText}>Actualiser</Text>
                </TouchableOpacity>
              </View>
            </>
          }
          ListEmptyComponent={
            loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : <Text style={styles.empty}>Aucune affectation trouvée.</Text>
          }
        />
      )}

      {loading ? <ActivityIndicator style={{ position: 'absolute', top: 110, right: 16 }} /> : null}

      <Modal visible={showRdvModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Planifier le retrait client</Text>
            <Text style={styles.modalSub}>Client: {rdvTarget?.clientNom || '—'}</Text>

            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={rdvForm.date}
              onChangeText={(v) => setRdvForm((p) => ({ ...p, date: v }))}
              placeholder="2026-03-10"
            />

            <Text style={styles.label}>Heure (HH:mm)</Text>
            <TextInput
              style={styles.input}
              value={rdvForm.heure}
              onChangeText={(v) => setRdvForm((p) => ({ ...p, heure: v }))}
              placeholder="10:00"
            />

            <Text style={styles.label}>Motif</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {['Livraison', 'Essayage', 'Prise de mesures', 'Autre'].map((m) => (
                <TouchableOpacity
                  key={`motif-${m}`}
                  style={[styles.chip, rdvForm.motif === m && styles.chipActive]}
                  onPress={() => setRdvForm((p) => ({ ...p, motif: m }))}
                >
                  <Text style={[styles.chipText, rdvForm.motif === m && styles.chipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              multiline
              value={rdvForm.notes}
              onChangeText={(v) => setRdvForm((p) => ({ ...p, notes: v }))}
              placeholder="Informations supplémentaires"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={closeRdvModal}>
                <Text style={styles.btnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={createRendezvous} disabled={rdvSaving}>
                <Text style={styles.btnText}>{rdvSaving ? 'Enregistrement...' : 'Créer RDV'}</Text>
              </TouchableOpacity>
            </View>
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
  title: { fontSize: 22, fontWeight: '900', color: '#1b2a4a' },

  formBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9edf5',
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: { fontWeight: '900', color: '#203155', marginBottom: 8, fontSize: 16 },
  label: { marginTop: 8, marginBottom: 6, color: '#2c3b5b', fontWeight: '700' },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe2ef',
  },
  chipActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  chipText: { color: '#2b3c62', fontWeight: '700' },
  chipTextActive: { color: '#fff' },

  input: {
    borderWidth: 1,
    borderColor: '#dfe5f1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },

  clientRow: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e7f4',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  clientRowActive: { borderColor: '#0d6efd', backgroundColor: '#f0f6ff' },
  clientName: { fontWeight: '800', color: '#1f2d4c' },
  clientMeta: { color: '#63708e', marginTop: 2, marginBottom: 6 },
  priceInput: {
    borderWidth: 1,
    borderColor: '#cfd8eb',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },

  createBtn: {
    marginTop: 10,
    backgroundColor: '#0d6efd',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  createBtnText: { color: '#fff', fontWeight: '900' },

  refreshBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#cfd6e6',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  refreshBtnText: { color: '#44567d', fontWeight: '800' },

  overdueBanner: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fecdd3',
    backgroundColor: '#fff1f2',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overdueBannerText: { color: '#9f1239', fontWeight: '700', flex: 1, marginRight: 10 },
  overdueBannerAction: { color: '#be123c', fontWeight: '900' },

  affCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9edf5',
    padding: 12,
    marginBottom: 10,
  },
  affTitle: { fontWeight: '900', color: '#1f2d4c', fontSize: 15 },
  affSub: { color: '#5f6f90', marginTop: 2 },
  affRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontWeight: '900', fontSize: 12 },
  price: { color: '#1f2d4c', fontWeight: '900' },
  progressTrack: {
    marginTop: 8,
    height: 6,
    backgroundColor: '#e9edf5',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
  },
  progressLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#63708e',
    fontWeight: '700',
    textAlign: 'right',
  },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btn: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  btnPrimary: { backgroundColor: '#0d6efd' },
  btnInfo: { backgroundColor: '#0dcaf0' },
  btnSuccess: { backgroundColor: '#198754' },
  btnDanger: { backgroundColor: '#dc3545' },
  btnText: { color: '#fff', fontWeight: '900' },

  noPermissionBox: {
    margin: 16,
    backgroundColor: '#fff3f3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffd6d6',
    padding: 14,
  },
  noPermissionText: { color: '#a52a2a', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#64708b', marginTop: 40 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,18,35,0.45)',
    justifyContent: 'center',
    padding: 14,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1b2a4a' },
  modalSub: { marginTop: 4, color: '#60708f' },
  modalActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
