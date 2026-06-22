import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/backend';

export default function AtelierScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [ateliers, setAteliers] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ nom: '', adresse: '', email: '', telephone: '', dateCreation: '' });
  const [plans, setPlans] = useState([]);
  const [planCode, setPlanCode] = useState('');

  const canView = ['SUPERADMIN', 'PROPRIETAIRE'].includes(userRole);
  const canAdd = userRole === 'SUPERADMIN';

  const loadAteliers = async () => {
    if (!canView) return;
    try {
      setLoading(true);
      const res = await api.get('/ateliers');
      setAteliers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setAteliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('userData');
      const user = raw ? JSON.parse(raw) : null;
      setUserRole(String(user?.role || '').toUpperCase());
    })();
  }, []);

  useEffect(() => {
    loadAteliers();
  }, [userRole]);

  useEffect(() => {
    if (!canAdd) return;
    (async () => {
      try {
        const res = await api.get('/subscription/plans');
        const data = Array.isArray(res.data) ? res.data : [];
        setPlans(data);
        if (!planCode && data.length > 0) {
          setPlanCode(data[0]?.code || 'MENSUEL');
        }
      } catch {
        setPlans([]);
      }
    })();
  }, [canAdd]);

  const handleCreate = async () => {
    if (!formData.nom || !formData.adresse || !formData.email || !formData.telephone) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    try {
      const payload = { ...formData };
      if (formData.dateCreation) {
        payload.dateCreation = `${formData.dateCreation}T00:00:00`;
      } else {
        delete payload.dateCreation;
      }
      const res = await api.post('/ateliers', payload);
      const createdId = res?.data?.id;
      if (createdId && planCode) {
        const activatePayload = { planCode };
        if (formData.dateCreation) activatePayload.startAt = `${formData.dateCreation}T00:00:00`;
        try {
          await api.post(`/admin/subscriptions/ateliers/${createdId}/activate`, activatePayload);
        } catch {
          // ignore activation errors
        }
      }
      setShowAdd(false);
      setFormData({ nom: '', adresse: '', email: '', telephone: '', dateCreation: '' });
      loadAteliers();
      Alert.alert('Succès', 'Atelier ajouté avec succès');
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.error || "Impossible d'ajouter l'atelier");
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ateliers</Text>
        <View style={{ width: 34 }} />
      </View>

      {!canView ? (
        <View style={styles.noPermissionBox}>
          <Text style={styles.noPermissionText}>Accès réservé aux administrateurs d’atelier.</Text>
        </View>
      ) : (
        <>
          {canAdd ? (
            <View style={styles.toolbar}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  const today = new Date();
                  const yyyy = today.getFullYear();
                  const mm = String(today.getMonth() + 1).padStart(2, '0');
                  const dd = String(today.getDate()).padStart(2, '0');
                  setFormData((prev) => ({
                    ...prev,
                    dateCreation: prev.dateCreation || `${yyyy}-${mm}-${dd}`,
                  }));
                  if (!planCode && plans.length > 0) {
                    setPlanCode(plans[0]?.code || 'MENSUEL');
                  }
                  setShowAdd(true);
                }}
              >
                <Text style={styles.primaryBtnText}>+ Ajouter Atelier</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {loading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
          <FlatList
            data={ateliers}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
            ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Aucun atelier trouvé.</Text> : null}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.nom || 'Atelier'}</Text>
                <Text style={styles.cardSub}>{item.adresse || 'Adresse non renseignée'}</Text>
                <Text style={styles.cardSub}>{item.email || 'Email non renseigné'}</Text>
                <Text style={styles.cardSub}>{item.telephone || 'Téléphone non renseigné'}</Text>
              </View>
            )}
          />
        </>
      )}

      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>Ajouter un atelier</Text>
              <Text style={styles.inputLabel}>Nom</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom"
                value={formData.nom}
                onChangeText={(v) => setFormData({ ...formData, nom: v })}
              />
              <Text style={styles.inputLabel}>Adresse</Text>
              <TextInput
                style={styles.input}
                placeholder="Adresse"
                value={formData.adresse}
                onChangeText={(v) => setFormData({ ...formData, adresse: v })}
              />
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(v) => setFormData({ ...formData, email: v })}
              />
              <Text style={styles.inputLabel}>Téléphone</Text>
              <TextInput
                style={styles.input}
                placeholder="Téléphone"
                keyboardType="phone-pad"
                value={formData.telephone}
                onChangeText={(v) => setFormData({ ...formData, telephone: v })}
              />
              <Text style={styles.inputLabel}>Date de création</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.dateCreation}
                onChangeText={(v) => setFormData({ ...formData, dateCreation: v })}
              />
              <Text style={styles.inputLabel}>Plan d'abonnement (initial)</Text>
              <View style={styles.optionRow}>
                {plans.map((p) => (
                  <TouchableOpacity
                    key={p.code}
                    style={[styles.optionBtn, planCode === p.code && styles.optionBtnActive]}
                    onPress={() => setPlanCode(p.code)}
                  >
                    <Text style={[styles.optionText, planCode === p.code && styles.optionTextActive]}>
                      {p.libelle || p.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowAdd(false)}>
                  <Text style={styles.outlineBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleCreate}>
                  <Text style={styles.primaryBtnText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  title: { fontSize: 22, fontWeight: '900', color: '#1b2a4a' },
  toolbar: { paddingHorizontal: 12, paddingTop: 12, alignItems: 'flex-end' },
  primaryBtn: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 14,
    borderRadius: 10,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5eaf3',
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
  },
  cardTitle: { fontWeight: '900', color: '#1d2c4d', fontSize: 16 },
  cardSub: { color: '#6b7a95', marginTop: 4 },
  noPermissionBox: {
    margin: 16,
    backgroundColor: '#fff3f3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffd6d6',
    padding: 14,
  },
  noPermissionText: { color: '#a52a2a', fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#66758f', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 12, color: '#1b2a4a' },
  inputLabel: { fontWeight: '700', color: '#1b2a4a', marginBottom: 6 },
  input: {
    backgroundColor: '#f8f9fc',
    borderWidth: 1,
    borderColor: '#e5eaf3',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  outlineBtn: { borderWidth: 1, borderColor: '#0d6efd', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  outlineBtnText: { color: '#0d6efd', fontWeight: '700' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  optionBtn: { borderWidth: 1, borderColor: '#ccd6eb', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  optionBtnActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  optionText: { color: '#344563', fontWeight: '700', fontSize: 12 },
  optionTextActive: { color: '#fff' },
});
