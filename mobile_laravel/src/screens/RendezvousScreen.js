import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, BottomBar } from '../components/MobileShell';
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
      PRET: { label: 'Prêt à récupérer', color: COLORS.success, bg: '#eafaf1' },
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
      <AppHeader navigation={navigation} title="Rendez-vous" subtitle="Agenda de l'atelier" showBack />

      {canCreateRdv ? (
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('RendezvousCreate')}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.createBtnText}>Nouveau rendez-vous</Text>
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
                <TouchableOpacity style={[styles.actionBtn, styles.successBtn]} onPress={() => handleStatusAction(item.id, 'Prêt à récupérer', 'pret')}>
                  <Text style={styles.actionText}>Prêt</Text>
                </TouchableOpacity>
              ) : null}
              {canUpdateRdv && item?.statut === 'PRET' ? (
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
      <BottomBar navigation={navigation} active="Rendezvous" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  item: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef2f8',
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  small: { color: '#62748c', fontSize: 12, marginTop: 2 },
  clientName: { fontWeight: '900', color: '#1d2c4d', marginBottom: 4, fontSize: 15 },
  createBtn: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
