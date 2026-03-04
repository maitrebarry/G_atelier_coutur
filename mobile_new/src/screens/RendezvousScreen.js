import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import api from '../api/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  primary: '#0d6efd',
  success: '#198754',
  danger: '#dc3545',
  info: '#0dcaf0',
  warning: '#f59f00',
  neutral: '#6c757d',
};

export default function RendezvousScreen({ navigation }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [atelierId, setAtelierId] = useState('');
  const [error, setError] = useState('');
  const [userData, setUserData] = useState(null);

  const role = (userData?.role || '').toUpperCase();
  const permissions = Array.isArray(userData?.permissions)
    ? userData.permissions.map((p) => (typeof p === 'string' ? p : p?.code)).filter(Boolean)
    : [];

  const hasPermission = (code) => {
    if (!code) return true;
    if (['SUPERADMIN', 'PROPRIETAIRE'].includes(role)) return true;
    return permissions.includes(code);
  };

  const canViewRdv = hasPermission('RENDEZ_VOUS_VOIR');
  const canCreateRdv = hasPermission('RENDEZ_VOUS_CREER') || canViewRdv;
  const canUpdateRdv = hasPermission('RENDEZ_VOUS_MODIFIER');
  const canDeleteRdv = hasPermission('RENDEZ_VOUS_SUPPRIMER');

  const statusMeta = useMemo(
    () => ({
      PLANIFIE: { label: 'Planifié', color: COLORS.info, bg: '#e8faff' },
      EN_ATTENTE: { label: 'En attente', color: COLORS.warning, bg: '#fff7e6' },
      CONFIRME: { label: 'Confirmé', color: COLORS.success, bg: '#eafaf1' },
      ANNULE: { label: 'Annulé', color: COLORS.danger, bg: '#fdecee' },
      TERMINE: { label: 'Terminé', color: COLORS.neutral, bg: '#f2f4f7' },
    }),
    []
  );

  const loadRendezvous = async (atelier, silent = false) => {
    if (!atelier) {
      setList([]);
      setError("Atelier introuvable. Reconnectez-vous.");
      return;
    }
    try {
      if (!silent) setLoading(true);
      setError('');

      const [aVenirRes, aujourdhuiRes] = await Promise.all([
        api.get(`/rendezvous/atelier/${atelier}/a-venir`),
        api.get(`/rendezvous/atelier/${atelier}/aujourdhui`),
      ]);

      const aVenir = Array.isArray(aVenirRes?.data) ? aVenirRes.data : [];
      const aujourdhui = Array.isArray(aujourdhuiRes?.data) ? aujourdhuiRes.data : [];

      const map = new Map();
      [...aujourdhui, ...aVenir].forEach((rdv) => {
        if (rdv?.id) map.set(String(rdv.id), rdv);
      });

      const mapped = Array.from(map.values()).map((rdv) => ({
        id: rdv.id,
        dateRDV: rdv.dateRDV || rdv.date,
        typeRendezVous: rdv.typeRendezVous || rdv.type,
        statut: rdv.statut,
        clientNomComplet: rdv.clientNomComplet || rdv.clientNom || rdv.clientName || '',
        clientContact: rdv.clientContact || rdv.clientTelephone || '',
      }));

      setList(mapped);
    } catch (e) {
      setError("Impossible de charger les rendez-vous.");
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('userData');
        const user = raw ? JSON.parse(raw) : null;
        setUserData(user);
        const atelier = String(user?.atelierId || user?.atelier?.id || '');
        setAtelierId(atelier);
        await loadRendezvous(atelier);
      } catch (e) {
        setError("Impossible de charger les rendez-vous.");
      }
    })();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRendezvous(atelierId, true);
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('fr-FR');
  };

  const handleStatusAction = (id, actionLabel, apiAction) => {
    Alert.alert('Confirmation', `Voulez-vous ${actionLabel.toLowerCase()} ce rendez-vous ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        onPress: async () => {
          try {
            await api.put(`/rendezvous/${id}/${apiAction}`);
            await loadRendezvous(atelierId, true);
            Alert.alert('Succès', `Rendez-vous ${actionLabel.toLowerCase()}.`);
          } catch (e) {
            Alert.alert('Erreur', 'Action impossible.');
          }
        },
      },
    ]);
  };

  const handleDelete = (id) => {
    Alert.alert('Suppression', 'Supprimer ce rendez-vous ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/rendezvous/${id}`);
            await loadRendezvous(atelierId, true);
            Alert.alert('Succès', 'Rendez-vous supprimé.');
          } catch (e) {
            Alert.alert('Erreur', 'Suppression impossible.');
          }
        },
      },
    ]);
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
        <Text style={styles.title}>Rendez-vous</Text>
        <View style={{ width: 34 }} />
      </View>

      {canCreateRdv ? (
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('RendezvousCreate')}>
          <Text style={styles.createBtnText}>+ Nouveau rendez-vous</Text>
        </TouchableOpacity>
      ) : null}

      {loading ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!canViewRdv ? <Text style={styles.errorText}>Vous n'avez pas la permission de voir les rendez-vous.</Text> : null}

      <FlatList
        data={canViewRdv && Array.isArray(list) ? list : []}
        keyExtractor={(i, idx) => String(i?.id || idx)}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Aucun rendez-vous trouvé.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.clientName}>{item?.clientNomComplet || 'Client'}</Text>
            <Text style={styles.small}>{item?.clientContact || 'Contact non renseigné'}</Text>
            <Text style={styles.small}>{formatDate(item?.dateRDV)}</Text>
            <Text style={styles.small}>{item?.typeRendezVous || 'RDV'}</Text>

            {(() => {
              const s = statusMeta[item?.statut] || { label: item?.statut || '—', color: '#6c757d', bg: '#f2f4f7' };
              return (
                <View style={[styles.statusChip, { borderColor: s.color, backgroundColor: s.bg }]}> 
                  <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                </View>
              );
            })()}

            <View style={styles.actionsRow}>
              {canUpdateRdv && (item?.statut === 'EN_ATTENTE' || item?.statut === 'PLANIFIE') ? (
                <TouchableOpacity style={[styles.actionBtn, styles.successBtn]} onPress={() => handleStatusAction(item.id, 'Confirmé', 'confirmer')}>
                  <Text style={styles.actionText}>Confirmer</Text>
                </TouchableOpacity>
              ) : null}
              {canUpdateRdv && (item?.statut === 'EN_ATTENTE' || item?.statut === 'PLANIFIE') ? (
                <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => handleStatusAction(item.id, 'Annulé', 'annuler')}>
                  <Text style={styles.actionText}>Annuler</Text>
                </TouchableOpacity>
              ) : null}
              {canUpdateRdv && item?.statut === 'CONFIRME' ? (
                <TouchableOpacity style={[styles.actionBtn, styles.infoBtn]} onPress={() => handleStatusAction(item.id, 'Terminé', 'terminer')}>
                  <Text style={styles.actionText}>Terminer</Text>
                </TouchableOpacity>
              ) : null}
              {canDeleteRdv && item?.statut !== 'CONFIRME' && item?.statut !== 'TERMINE' ? (
                <TouchableOpacity style={[styles.actionBtn, styles.outlineDangerBtn]} onPress={() => handleDelete(item.id)}>
                  <Text style={[styles.actionText, { color: COLORS.danger }]}>Supprimer</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      />
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
  title: { fontSize: 22, fontWeight: '900', color: '#1b2a4a' },
  item: { padding: 12, borderWidth: 1, borderColor: '#e5eaf3', borderRadius: 12, marginBottom: 10, backgroundColor: '#fff' },
  small: { color: '#666', fontSize: 12, marginTop: 2 },
  clientName: { fontWeight: '900', color: '#1d2c4d', marginBottom: 4 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f4fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 20, color: '#1b2a4a', fontWeight: '700' },
  createBtn: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontWeight: '900' },
  errorText: { color: '#c62828', marginBottom: 8, marginHorizontal: 12 },
  emptyText: { textAlign: 'center', color: '#66758f', marginTop: 20 },
  statusChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontWeight: '900', fontSize: 12 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionBtn: { borderRadius: 9, paddingVertical: 8, paddingHorizontal: 10 },
  actionText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  successBtn: { backgroundColor: COLORS.success },
  dangerBtn: { backgroundColor: COLORS.danger },
  infoBtn: { backgroundColor: COLORS.info },
  outlineDangerBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.danger },
});
