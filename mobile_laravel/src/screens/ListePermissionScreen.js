import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/backend';

export default function ListePermissionScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: '', code: '', description: '' });

  const role = (userData?.role || '').toUpperCase();
  const canAccess = role === 'SUPERADMIN';
  const canEdit = role === 'SUPERADMIN';
  const canDelete = role === 'SUPERADMIN';

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/permissions');
      setPermissions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('userData');
      const u = raw ? JSON.parse(raw) : null;
      setUserData(u);
    })();
  }, []);

  useEffect(() => {
    if (canAccess) loadPermissions();
  }, [canAccess]);

  const permissionsByModule = useMemo(() => {
    const grouped = {};
    permissions.forEach((p) => {
      const module = String(p.code || 'AUTRE').split('_')[0];
      if (!grouped[module]) grouped[module] = [];
      grouped[module].push(p);
    });
    return grouped;
  }, [permissions]);

  const openModal = (perm) => {
    if (perm) {
      setIsEditing(true);
      setFormData({ id: perm.id, code: perm.code || '', description: perm.description || '' });
    } else {
      setIsEditing(false);
      setFormData({ id: '', code: '', description: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.description) {
      Alert.alert('Erreur', 'Tous les champs sont requis');
      return;
    }
    if (!/^[A-Z_]+$/.test(formData.code)) {
      Alert.alert('Erreur', 'Le code doit contenir uniquement des lettres majuscules et des underscores');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/admin/permissions/${formData.id}`, {
          code: formData.code,
          description: formData.description,
        });
      } else {
        await api.post('/admin/permissions', {
          code: formData.code,
          description: formData.description,
        });
      }
      setShowModal(false);
      loadPermissions();
      Alert.alert('Succès', isEditing ? 'Permission modifiée avec succès' : 'Permission créée avec succès');
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.error || 'Impossible de sauvegarder la permission');
    }
  };

  const handleDelete = (perm) => {
    Alert.alert('Confirmation', `Supprimer la permission "${perm.code}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/permissions/${perm.id}`);
            loadPermissions();
          } catch (e) {
            Alert.alert('Erreur', e?.response?.data?.error || 'Suppression impossible');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.page}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Liste Permission</Text>
        <View style={{ width: 34 }} />
      </View>

      {!canAccess ? (
        <View style={styles.noPermissionBox}>
          <Text style={styles.noPermissionText}>Accès réservé aux administrateurs.</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.toolbar}>
            <Text style={styles.toolbarTitle}>Toutes les permissions du système</Text>
            {role === 'SUPERADMIN' ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => openModal()}>
                <Text style={styles.primaryBtnText}>+ Ajouter</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}

          <FlatList
            data={Object.keys(permissionsByModule).sort()}
            keyExtractor={(item) => item}
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
            ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Aucune permission trouvée.</Text> : null}
            renderItem={({ item }) => (
              <View style={styles.moduleCard}>
                <Text style={styles.moduleHeader}>Module {item}</Text>
                {permissionsByModule[item].map((perm) => (
                  <View key={perm.id} style={styles.permRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.permCode}>{perm.code}</Text>
                      <Text style={styles.permDesc}>{perm.description}</Text>
                    </View>
                    {canEdit ? (
                      <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.outlineBtn} onPress={() => openModal(perm)}>
                          <Text style={styles.outlineBtnText}>Modifier</Text>
                        </TouchableOpacity>
                        {canDelete ? (
                          <TouchableOpacity style={styles.dangerBtn} onPress={() => handleDelete(perm)}>
                            <Text style={styles.dangerBtnText}>Supprimer</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          />
        </View>
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>{isEditing ? 'Modifier la permission' : 'Ajouter une permission'}</Text>
              <Text style={styles.inputLabel}>Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Code (EX: MODULE_ACTION)"
                value={formData.code}
                onChangeText={(v) => setFormData({ ...formData, code: v.toUpperCase() })}
              />
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, { height: 90 }]}
                multiline
                placeholder="Description"
                value={formData.description}
                onChangeText={(v) => setFormData({ ...formData, description: v })}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.outlineBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
                  <Text style={styles.primaryBtnText}>{isEditing ? 'Enregistrer' : 'Ajouter'}</Text>
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
  title: { fontSize: 20, fontWeight: '900', color: '#1b2a4a' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  toolbarTitle: { fontWeight: '900', color: '#1b2a4a', flex: 1, paddingRight: 8 },
  primaryBtn: { backgroundColor: '#0d6efd', paddingHorizontal: 14, borderRadius: 10, height: 38, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  moduleCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5eaf3', borderRadius: 12, marginBottom: 12 },
  moduleHeader: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eef0f4', fontWeight: '800', color: '#1b2a4a' },
  permRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  permCode: { fontWeight: '700', color: '#1d2c4d' },
  permDesc: { color: '#6b7a95', fontSize: 12, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  outlineBtn: { borderWidth: 1, borderColor: '#0d6efd', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  outlineBtnText: { color: '#0d6efd', fontWeight: '700', fontSize: 12 },
  dangerBtn: { borderWidth: 1, borderColor: '#dc3545', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  dangerBtnText: { color: '#dc3545', fontWeight: '700', fontSize: 12 },
  emptyText: { textAlign: 'center', color: '#66758f', marginTop: 20 },
  noPermissionBox: { margin: 16, backgroundColor: '#fff3f3', borderRadius: 12, borderWidth: 1, borderColor: '#ffd6d6', padding: 14 },
  noPermissionText: { color: '#a52a2a', fontWeight: '700' },
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
});
