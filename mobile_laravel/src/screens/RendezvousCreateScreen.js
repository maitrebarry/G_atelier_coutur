import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import api from '../api/backend';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/MobileShell';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  primary: '#0d6efd',
  success: '#198754',
  danger: '#dc3545',
  info: '#0dcaf0',
  warning: '#f59f00',
};

export default function RendezvousCreateScreen({ route, navigation }) {
  const initialClient = route.params?.client || null;
  const [atelierId, setAtelierId] = useState('');
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(initialClient?.id ? String(initialClient.id) : '');
  const [selectedClientDetails, setSelectedClientDetails] = useState(null);
  const [selectedMesureIds, setSelectedMesureIds] = useState([]);
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('10:00');
  const [motif, setMotif] = useState('LIVRAISON');
  const [note, setNote] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('userData');
        const user = raw ? JSON.parse(raw) : null;
        const at = String(user?.atelierId || user?.atelier?.id || '');
        setAtelierId(at);
        if (at) {
          const res = await api.get(`/rendezvous/atelier/${at}/clients`);
          setClients(Array.isArray(res?.data) ? res.data : []);
        }
      } catch (e) {
        setClients([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!clientId) {
      setSelectedClientDetails(null);
      setSelectedMesureIds([]);
      return;
    }

    (async () => {
      try {
        const res = await api.get(`/rendezvous/clients/${clientId}/details`);
        setSelectedClientDetails(res.data || null);
        setSelectedMesureIds([]);
      } catch (e) {
        setSelectedClientDetails(null);
      }
    })();
  }, [clientId]);

  const selectedClient = useMemo(() => {
    return clients.find((c) => String(c?.id) === String(clientId)) || initialClient || null;
  }, [clients, clientId, initialClient]);

  const toggleMesure = (mesureId) => {
    setSelectedMesureIds((prev) =>
      prev.includes(mesureId) ? prev.filter((id) => id !== mesureId) : [...prev, mesureId]
    );
  };

  const selectAllMesures = () => {
    const allIds = Array.isArray(selectedClientDetails?.mesures)
      ? selectedClientDetails.mesures.map((m) => String(m.id))
      : [];
    setSelectedMesureIds(allIds);
  };

  const clearAllMesures = () => setSelectedMesureIds([]);

  const handleCreate = async () => {
    if (!clientId) {
      Alert.alert('Validation', 'Veuillez choisir un client');
      return;
    }
    if (!date || !heure) {
      Alert.alert('Validation', 'Veuillez renseigner date et heure');
      return;
    }
    if (!atelierId) {
      Alert.alert('Erreur', 'Atelier introuvable, reconnectez-vous');
      return;
    }

    if (!selectedClient?.email || !selectedClient.email.includes('@')) {
      Alert.alert(
        'Attention',
        "Le client n'a pas d'email valide. Le rendez-vous sera créé, mais aucune confirmation ne pourra être envoyée par email."
      );
    }

    try {
      const payloadBase = {
        clientId,
        atelierId,
        dateRDV: `${date}T${heure}`,
        typeRendezVous: motif,
        notes: note,
      };

      if (selectedMesureIds.length > 0) {
        let createdCount = 0;
        for (const mesureId of selectedMesureIds) {
          await api.post('/rendezvous', { ...payloadBase, mesureId });
          createdCount += 1;
        }
        Alert.alert('Succès', `${createdCount} rendez-vous créés avec succès pour les vêtements sélectionnés.`);
      } else {
        await api.post('/rendezvous', payloadBase);
        Alert.alert('Succès', 'Rendez-vous créé avec succès ! Un email de confirmation a été envoyé au client.');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de créer le rendez-vous');
    }
  };

  const mesureLabel = (mesure) => {
    const label = mesure.modeleNom || mesure.typeVetement || 'Vêtement';
    const suffix = mesure.description ? ` — ${mesure.description}` : '';
    return `${label}${suffix}`;
  };

  return (
    <View style={styles.page}>
      <AppHeader navigation={navigation} title="Nouveau rendez-vous" showBack />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.sectionCard}>
          <Text style={styles.label}>Client</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {clients.map((c) => (
              <TouchableOpacity
                key={String(c.id)}
                style={[styles.chip, String(clientId) === String(c.id) && styles.chipActive]}
                onPress={() => setClientId(String(c.id))}
              >
                <Text style={[styles.chipText, String(clientId) === String(c.id) && styles.chipTextActive]}>
                  {(c.prenom || '') + ' ' + (c.nom || '')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.clientInfo}>
            Client sélectionné: {selectedClient?.prenom || selectedClient?.nom || '—'} {selectedClient?.nom ? '' : ''}
          </Text>

          {selectedClientDetails?.mesures?.length > 0 ? (
            <>
              <View style={styles.rowBetween}>
                <Text style={[styles.label, { marginTop: 10 }]}>Vêtements du client</Text>
                <View style={styles.rowGap}>
                  <TouchableOpacity style={styles.smallBtn} onPress={selectAllMesures}>
                    <Text style={styles.smallBtnText}>Tout</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallBtn, styles.smallBtnOutline]} onPress={clearAllMesures}>
                    <Text style={[styles.smallBtnText, styles.smallBtnOutlineText]}>Aucun</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {selectedClientDetails.mesures.map((mesure) => {
                  const id = String(mesure.id);
                  const active = selectedMesureIds.includes(id);
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleMesure(id)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {mesureLabel(mesure)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : clientId ? (
            <Text style={styles.infoText}>Ce client n'a pas encore de vêtements enregistrés.</Text>
          ) : null}

          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput placeholder="Date (YYYY-MM-DD)" style={styles.input} value={date} onChangeText={setDate} />

          <Text style={styles.label}>Heure (HH:mm)</Text>
          <TextInput placeholder="Heure (HH:mm)" style={styles.input} value={heure} onChangeText={setHeure} />

          <Text style={styles.label}>Motif</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {['LIVRAISON', 'RETOUCHE', 'MESURE', 'AUTRE'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, motif === m && styles.chipActive]}
                onPress={() => setMotif(m)}
              >
                <Text style={[styles.chipText, motif === m && styles.chipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput placeholder="Note" style={[styles.input, { height: 80 }]} multiline value={note} onChangeText={setNote} />
          <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
            <Text style={styles.saveBtnText}>Créer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f6f8fb' },
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
  container: { padding: 12, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '900', color: '#1b2a4a' },
  sectionCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9edf5',
    borderRadius: 12,
    padding: 12,
  },
  input: { borderWidth: 1, borderColor: '#dfe5f1', padding: 10, borderRadius: 10, marginBottom: 12, backgroundColor: '#fff' },
  label: { fontWeight: '700', marginBottom: 6, marginTop: 6 },
  clientInfo: { marginBottom: 12, color: '#4a5368' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowGap: { flexDirection: 'row' },
  horizontalList: { paddingVertical: 4, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: '#dbe2ef',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: '#2b3c62', fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  smallBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  smallBtnOutline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  smallBtnOutlineText: { color: COLORS.primary },
  infoText: { color: '#6c757d', marginBottom: 12 },
  saveBtn: {
    marginTop: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '900' },
});
