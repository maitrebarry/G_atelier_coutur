import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, BottomBar } from '../components/MobileShell';
import api from '../api/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATUS_META = {
  PLANIFIE:   { label: 'Planifié',           color: '#0dcaf0', bg: '#e8faff' },
  EN_ATTENTE: { label: 'En attente',         color: '#f59f00', bg: '#fff7e6' },
  CONFIRME:   { label: 'Confirmé',           color: '#198754', bg: '#eafaf1' },
  PRET:       { label: 'Prêt à récupérer',   color: '#198754', bg: '#eafaf1' },
  ANNULE:     { label: 'Annulé',             color: '#dc3545', bg: '#fdecee' },
  TERMINE:    { label: 'Terminé',            color: '#6c757d', bg: '#f2f4f7' },
};

const TODAY = new Date().toDateString();

const isToday = (dateStr) => {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === TODAY;
};

const FILTERS = [
  { key: 'aVenir',    label: 'À venir',     endpoint: (id) => `/rendezvous/atelier/${id}/a-venir` },
  { key: 'aujourdhui', label: "Aujourd'hui", endpoint: (id) => `/rendezvous/atelier/${id}/aujourdhui` },
  { key: 'tous',      label: 'Tous',        endpoint: (id) => `/rendezvous/atelier/${id}/tous` },
];

export default function RendezvousScreen({ navigation }) {
  const [list, setList]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [atelierId, setAtelierId] = useState('');
  const [error, setError]         = useState('');
  const [userData, setUserData]   = useState(null);
  const [activeFilter, setActiveFilter] = useState('aVenir');

  const role = (userData?.role || '').toUpperCase();
  const permissions = Array.isArray(userData?.permissions)
    ? userData.permissions.map((p) => (typeof p === 'string' ? p : p?.code)).filter(Boolean)
    : [];
  const hasPermission = (code) => {
    if (!code) return true;
    if (['SUPERADMIN', 'PROPRIETAIRE'].includes(role)) return true;
    return permissions.includes(code);
  };
  const canViewRdv   = hasPermission('RENDEZ_VOUS_VOIR');
  const canCreateRdv = hasPermission('RENDEZ_VOUS_CREER') || canViewRdv;
  const canUpdateRdv = hasPermission('RENDEZ_VOUS_MODIFIER');
  const canDeleteRdv = hasPermission('RENDEZ_VOUS_SUPPRIMER');

  const loadRendezvous = async (atelier, filter, silent = false) => {
    if (!atelier) { setError("Atelier introuvable."); return; }
    try {
      if (!silent) setLoading(true);
      setError('');
      const filterDef = FILTERS.find((f) => f.key === filter) || FILTERS[0];
      const res = await api.get(filterDef.endpoint(atelier));
      const arr = Array.isArray(res?.data) ? res.data : [];
      setList(arr.map((rdv) => ({
        id: rdv.id,
        dateRDV: rdv.dateRDV || rdv.date,
        typeRendezVous: rdv.typeRendezVous || rdv.type,
        statut: rdv.statut,
        notes: rdv.notes || '',
        clientNomComplet: rdv.clientNomComplet || rdv.clientNom || '',
        clientContact: rdv.clientContact || rdv.client?.contact || '',
        resteAPayer: rdv.paiement?.resteAPayer || 0,
        estSolde: rdv.paiement?.estSolde || false,
        peutMarquerPret: rdv.peutMarquerPret || false,
      })));
    } catch {
      setError("Impossible de charger les rendez-vous.");
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('userData').then((raw) => {
      const user = raw ? JSON.parse(raw) : null;
      setUserData(user);
      const atelier = String(user?.atelierId || user?.atelier?.id || '');
      setAtelierId(atelier);
      loadRendezvous(atelier, activeFilter);
    }).catch(() => setError("Impossible de charger les rendez-vous."));
  }, []);

  useEffect(() => {
    if (atelierId) loadRendezvous(atelierId, activeFilter, true);
  }, [activeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRendezvous(atelierId, activeFilter, true);
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  };

  const handleAction = (id, label, endpoint, method = 'put') => {
    Alert.alert('Confirmation', `${label} ce rendez-vous ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        onPress: async () => {
          try {
            await api[method](`/rendezvous/${id}/${endpoint}`);
            await loadRendezvous(atelierId, activeFilter, true);
          } catch (e) {
            const msg = e?.response?.data?.message || 'Action impossible.';
            Alert.alert('Erreur', msg);
          }
        },
      },
    ]);
  };

  const handleDelete = (id) => {
    Alert.alert('Suppression', 'Supprimer ce rendez-vous ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/rendezvous/${id}`);
            await loadRendezvous(atelierId, activeFilter, true);
          } catch { Alert.alert('Erreur', 'Suppression impossible.'); }
        },
      },
    ]);
  };

  const todayCount = useMemo(() => list.filter((r) => isToday(r.dateRDV)).length, [list]);

  return (
    <View style={styles.container}>
      <AppHeader navigation={navigation} title="Rendez-vous" subtitle="Agenda de l'atelier" showBack />

      {canCreateRdv ? (
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('RendezvousCreate')}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.createBtnText}>Nouveau rendez-vous</Text>
        </TouchableOpacity>
      ) : null}

      {/* ── Filtres ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
              {f.label}{f.key === 'aujourdhui' && todayCount > 0 ? ` (${todayCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!canViewRdv ? <Text style={styles.errorText}>Permission insuffisante.</Text> : null}

      <FlatList
        data={canViewRdv && Array.isArray(list) ? list : []}
        keyExtractor={(i, idx) => String(i?.id || idx)}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Aucun rendez-vous trouvé.</Text> : null}
        renderItem={({ item }) => {
          const s = STATUS_META[item?.statut] || { label: item?.statut || '—', color: '#6c757d', bg: '#f2f4f7' };
          const today = isToday(item?.dateRDV);

          return (
            <View style={[styles.item, today && styles.itemToday]}>
              {today ? (
                <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Aujourd'hui</Text></View>
              ) : null}

              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientName}>{item?.clientNomComplet || 'Client'}</Text>
                  {item?.clientContact ? <Text style={styles.small}>📞 {item.clientContact}</Text> : null}
                </View>
                <View style={[styles.statusChip, { borderColor: s.color, backgroundColor: s.bg }]}>
                  <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>

              <Text style={styles.small}>🗓 {formatDate(item?.dateRDV)}</Text>
              <Text style={styles.small}>📋 {item?.typeRendezVous || 'RDV'}</Text>

              {item?.notes ? (
                <Text style={styles.notes}>💬 {item.notes}</Text>
              ) : null}

              {/* Solde restant */}
              {item?.resteAPayer > 0 ? (
                <View style={styles.soldeBox}>
                  <Ionicons name="alert-circle-outline" size={14} color="#dc3545" />
                  <Text style={styles.soldeText}>Reste à payer : {Number(item.resteAPayer).toLocaleString('fr-FR')} FCFA</Text>
                </View>
              ) : item?.estSolde ? (
                <View style={[styles.soldeBox, { backgroundColor: '#eafaf1', borderColor: '#b2d8bc' }]}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#198754" />
                  <Text style={[styles.soldeText, { color: '#198754' }]}>Client soldé</Text>
                </View>
              ) : null}

              <View style={styles.actionsRow}>
                {canUpdateRdv && ['EN_ATTENTE', 'PLANIFIE'].includes(item?.statut) ? (
                  <TouchableOpacity style={[styles.actionBtn, styles.successBtn]} onPress={() => handleAction(item.id, 'Confirmer', 'confirmer')}>
                    <Text style={styles.actionText}>Confirmer</Text>
                  </TouchableOpacity>
                ) : null}
                {canUpdateRdv && ['EN_ATTENTE', 'PLANIFIE'].includes(item?.statut) ? (
                  <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => handleAction(item.id, 'Annuler', 'annuler')}>
                    <Text style={styles.actionText}>Annuler</Text>
                  </TouchableOpacity>
                ) : null}
                {canUpdateRdv && item?.statut === 'CONFIRME' ? (
                  <TouchableOpacity style={[styles.actionBtn, styles.successBtn]} onPress={() => handleAction(item.id, 'Marquer prêt', 'pret')}>
                    <Text style={styles.actionText}>Prêt</Text>
                  </TouchableOpacity>
                ) : null}
                {canUpdateRdv && item?.statut === 'PRET' ? (
                  <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={() => handleAction(item.id, 'Terminer', 'terminer')}>
                    <Text style={styles.actionText}>Terminer</Text>
                  </TouchableOpacity>
                ) : null}
                {canDeleteRdv && !['CONFIRME', 'TERMINE'].includes(item?.statut) ? (
                  <TouchableOpacity style={[styles.actionBtn, styles.outlineBtn]} onPress={() => handleDelete(item.id)}>
                    <Text style={[styles.actionText, { color: '#dc3545' }]}>Supprimer</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        }}
      />
      <BottomBar navigation={navigation} active="Rendezvous" />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f4f6fb' },
  createBtn:   { marginHorizontal: 12, marginTop: 10, marginBottom: 4, backgroundColor: '#0d6efd', borderRadius: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: '#fff', fontWeight: '900' },
  filterRow:   { gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  filterChip:  { borderWidth: 1, borderColor: '#dbe2ef', borderRadius: 999, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 7 },
  filterChipActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  filterChipText: { color: '#2b3c62', fontWeight: '700', fontSize: 13 },
  filterChipTextActive: { color: '#fff' },
  errorText:   { color: '#c62828', marginBottom: 8, marginHorizontal: 12 },
  emptyText:   { textAlign: 'center', color: '#66758f', marginTop: 20 },

  item: {
    padding: 14, borderWidth: 1, borderColor: '#eef2f8',
    borderRadius: 16, marginBottom: 10, backgroundColor: '#fff',
    elevation: 2, shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  itemToday: { borderColor: '#f59f00', borderWidth: 1.5, backgroundColor: '#fffdf5' },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  todayBadge: { alignSelf: 'flex-start', backgroundColor: '#f59f00', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  todayBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  clientName:  { fontWeight: '900', color: '#1d2c4d', fontSize: 15 },
  small:       { color: '#62748c', fontSize: 12, marginTop: 3 },
  notes:       { color: '#4b5e78', fontSize: 12, marginTop: 6, fontStyle: 'italic', lineHeight: 17 },
  statusChip:  { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  statusText:  { fontWeight: '900', fontSize: 11 },

  soldeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, backgroundColor: '#fff0f0', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#fecdd3',
  },
  soldeText: { fontSize: 12, color: '#dc3545', fontWeight: '700' },

  actionsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionBtn:   { borderRadius: 9, paddingVertical: 8, paddingHorizontal: 12 },
  actionText:  { color: '#fff', fontWeight: '900', fontSize: 12 },
  successBtn:  { backgroundColor: '#198754' },
  dangerBtn:   { backgroundColor: '#dc3545' },
  infoBtn:     { backgroundColor: '#0dcaf0' },
  outlineBtn:  { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dc3545' },
});
