import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Modal, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/backend';

const emptyForm = {
  nom: '',
  prenom: '',
  email: '',
  motdepasse: '',
  role: '',
  atelierId: '',
};

export default function UtilisateursScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [users, setUsers] = useState([]);
  const [ateliers, setAteliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ ...emptyForm, id: null });

  const role = (userData?.role || '').toUpperCase();
  const userId = userData?.userId || userData?.id;
  const proprietaireAtelierId = userData?.atelierId || userData?.atelier?.id || '';

  const canManageUsers = ['SUPERADMIN', 'PROPRIETAIRE'].includes(role);

  const availableRoles = useMemo(() => {
    if (role === 'SUPERADMIN') return ['SUPERADMIN', 'PROPRIETAIRE', 'SECRETAIRE', 'TAILLEUR'];
    if (role === 'PROPRIETAIRE') return ['SECRETAIRE', 'TAILLEUR'];
    if (role === 'SECRETAIRE' || role === 'TAILLEUR') return [role];
    return [];
  }, [role]);

  const loadAteliers = async () => {
    if (!userData) return;
    try {
      if (role === 'PROPRIETAIRE' && proprietaireAtelierId) {
        const res = await api.get(`/ateliers/${proprietaireAtelierId}`);
        setAteliers(res.data ? [res.data] : []);
      } else if (role === 'SUPERADMIN') {
        const res = await api.get('/ateliers');
        setAteliers(Array.isArray(res.data) ? res.data : []);
      } else {
        setAteliers([]);
      }
    } catch {
      setAteliers([]);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/utilisateurs');
      let data = Array.isArray(res.data) ? res.data : [];

      if (role === 'PROPRIETAIRE') {
        data = data.filter((u) => {
          if (u.id === userId) return true;
          const sameAtelier = (u.atelier?.id || u.atelierId) === proprietaireAtelierId;
          return sameAtelier && ['TAILLEUR', 'SECRETAIRE'].includes(u.role);
        });
      }

      if (role === 'SECRETAIRE' || role === 'TAILLEUR') {
        data = data.filter((u) => u.id === userId);
      }

      setUsers(data);
    } catch {
      setUsers([]);
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
    if (!userData) return;
    loadUsers();
    loadAteliers();
  }, [userData, role]);

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      String(u.nom || '').toLowerCase().includes(term) ||
      String(u.prenom || '').toLowerCase().includes(term) ||
      String(u.email || '').toLowerCase().includes(term)
    );
  });

  const resetAddForm = () => {
    setFormData({
      ...emptyForm,
      role: role === 'PROPRIETAIRE' ? 'SECRETAIRE' : '',
      atelierId: role === 'PROPRIETAIRE' ? proprietaireAtelierId : '',
    });
  };

  const openAdd = () => {
    resetAddForm();
    setShowAdd(true);
  };

  const openEdit = (user) => {
    setEditForm({
      id: user.id,
      nom: user.nom || '',
      prenom: user.prenom || '',
      email: user.email || '',
      motdepasse: '',
      role: user.role || '',
      atelierId: user.atelier?.id || user.atelierId || '',
    });
    setShowEdit(true);
  };

  const handleAddSubmit = async () => {
    const payload = { ...formData };
    if (!payload.nom || !payload.prenom || !payload.email || !payload.motdepasse || !payload.role) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (role === 'PROPRIETAIRE') {
      if (['PROPRIETAIRE', 'SUPERADMIN'].includes(payload.role)) {
        Alert.alert('Erreur', "Vous ne pouvez pas attribuer ce rôle");
        return;
      }
      payload.atelierId = proprietaireAtelierId;
    }

    if (!payload.atelierId) delete payload.atelierId;

    try {
      await api.post('/utilisateurs', payload);
      setShowAdd(false);
      resetAddForm();
      loadUsers();
      Alert.alert('Succès', 'Utilisateur ajouté avec succès');
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || "Impossible d'ajouter l'utilisateur");
    }
  };

  const handleEditSubmit = async () => {
    if (!editForm.id) return;
    const payload = {
      nom: editForm.nom,
      prenom: editForm.prenom,
      email: editForm.email,
      role: editForm.role,
      atelierId: editForm.atelierId,
    };

    if (!payload.nom || !payload.prenom || !payload.email) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (editForm.motdepasse) payload.motdepasse = editForm.motdepasse;

    if (role === 'PROPRIETAIRE') {
      if (editForm.id === userId) {
        payload.role = 'PROPRIETAIRE';
        payload.atelierId = proprietaireAtelierId;
      } else {
        payload.atelierId = proprietaireAtelierId;
        if (['PROPRIETAIRE', 'SUPERADMIN'].includes(payload.role)) {
          Alert.alert('Erreur', "Vous ne pouvez pas attribuer ce rôle");
          return;
        }
      }
    }

    if (role === 'SECRETAIRE' || role === 'TAILLEUR') {
      if (editForm.id !== userId) {
        Alert.alert('Erreur', "Vous ne pouvez pas modifier cet utilisateur");
        return;
      }
      payload.role = role;
      delete payload.atelierId;
    }

    if (!payload.atelierId) delete payload.atelierId;

    try {
      await api.put(`/utilisateurs/${editForm.id}`, payload);
      setShowEdit(false);
      loadUsers();
      Alert.alert('Succès', 'Utilisateur modifié avec succès');
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de modifier utilisateur');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Confirmation', 'Supprimer cet utilisateur ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/utilisateurs/${id}`);
            loadUsers();
          } catch (e) {
            Alert.alert('Erreur', e?.response?.data?.message || 'Suppression impossible');
          }
        },
      },
    ]);
  };

  const canEditUser = (u) => {
    if (role === 'SUPERADMIN') return true;
    if (role === 'PROPRIETAIRE') {
      if (u.id === userId) return true;
      return (u.atelier?.id || u.atelierId) === proprietaireAtelierId && ['TAILLEUR', 'SECRETAIRE'].includes(u.role);
    }
    return u.id === userId;
  };

  const canDeleteUser = (u) => {
    if (role === 'SUPERADMIN') return true;
    if (role === 'PROPRIETAIRE') return u.id !== userId;
    return false;
  };

  return (
    <View style={styles.page}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Utilisateurs</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChangeText={setSearch}
        />
        {canManageUsers ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={openAdd}>
            <Text style={styles.primaryBtnText}>+ Ajouter</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Aucun utilisateur trouvé.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.prenom} {item.nom}</Text>
                <Text style={styles.cardSub}>{item.email}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{item.role}</Text>
                </View>
                {item.atelier?.nom ? (
                  <Text style={styles.cardSub}>Atelier: {item.atelier.nom}</Text>
                ) : null}
              </View>
            </View>

            {(canEditUser(item) || canDeleteUser(item)) && (
              <View style={styles.actionsRow}>
                {canEditUser(item) ? (
                  <TouchableOpacity style={styles.outlineBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.outlineBtnText}>Modifier</Text>
                  </TouchableOpacity>
                ) : null}
                {canDeleteUser(item) ? (
                  <TouchableOpacity style={styles.dangerBtn} onPress={() => handleDelete(item.id)}>
                    <Text style={styles.dangerBtnText}>Supprimer</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        )}
      />

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>Ajouter un utilisateur</Text>
              <Text style={styles.inputLabel}>Nom</Text>
              <TextInput style={styles.input} placeholder="Nom" value={formData.nom} onChangeText={(v) => setFormData({ ...formData, nom: v })} />
              <Text style={styles.inputLabel}>Prénom</Text>
              <TextInput style={styles.input} placeholder="Prénom" value={formData.prenom} onChangeText={(v) => setFormData({ ...formData, prenom: v })} />
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(v) => setFormData({ ...formData, email: v })} />
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <TextInput style={styles.input} placeholder="Mot de passe" secureTextEntry value={formData.motdepasse} onChangeText={(v) => setFormData({ ...formData, motdepasse: v })} />

              <Text style={styles.label}>Rôle</Text>
              <View style={styles.optionRow}>
                {availableRoles.map((r) => (
                  <TouchableOpacity key={r} style={[styles.optionBtn, formData.role === r && styles.optionBtnActive]} onPress={() => setFormData({ ...formData, role: r })}>
                    <Text style={[styles.optionText, formData.role === r && styles.optionTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {role === 'SUPERADMIN' ? (
                <>
                  <Text style={styles.label}>Atelier</Text>
                  <View style={styles.optionRow}>
                    {ateliers.map((a) => (
                      <TouchableOpacity key={a.id} style={[styles.optionBtn, formData.atelierId === a.id && styles.optionBtnActive]} onPress={() => setFormData({ ...formData, atelierId: a.id })}>
                        <Text style={[styles.optionText, formData.atelierId === a.id && styles.optionTextActive]}>{a.nom || 'Atelier'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowAdd(false)}>
                  <Text style={styles.outlineBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleAddSubmit}>
                  <Text style={styles.primaryBtnText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>Modifier l'utilisateur</Text>
              <Text style={styles.inputLabel}>Nom</Text>
              <TextInput style={styles.input} placeholder="Nom" value={editForm.nom} onChangeText={(v) => setEditForm({ ...editForm, nom: v })} />
              <Text style={styles.inputLabel}>Prénom</Text>
              <TextInput style={styles.input} placeholder="Prénom" value={editForm.prenom} onChangeText={(v) => setEditForm({ ...editForm, prenom: v })} />
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={editForm.email} onChangeText={(v) => setEditForm({ ...editForm, email: v })} />
              <Text style={styles.inputLabel}>Nouveau mot de passe (optionnel)</Text>
              <TextInput style={styles.input} placeholder="Nouveau mot de passe (optionnel)" secureTextEntry value={editForm.motdepasse} onChangeText={(v) => setEditForm({ ...editForm, motdepasse: v })} />

              <Text style={styles.label}>Rôle</Text>
              <View style={styles.optionRow}>
                {availableRoles.map((r) => (
                  <TouchableOpacity key={r} style={[styles.optionBtn, editForm.role === r && styles.optionBtnActive]} onPress={() => setEditForm({ ...editForm, role: r })}>
                    <Text style={[styles.optionText, editForm.role === r && styles.optionTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {role === 'SUPERADMIN' ? (
                <>
                  <Text style={styles.label}>Atelier</Text>
                  <View style={styles.optionRow}>
                    {ateliers.map((a) => (
                      <TouchableOpacity key={a.id} style={[styles.optionBtn, editForm.atelierId === a.id && styles.optionBtnActive]} onPress={() => setEditForm({ ...editForm, atelierId: a.id })}>
                        <Text style={[styles.optionText, editForm.atelierId === a.id && styles.optionTextActive]}>{a.nom || 'Atelier'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowEdit(false)}>
                  <Text style={styles.outlineBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleEditSubmit}>
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
  searchRow: { flexDirection: 'row', padding: 12, gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5eaf3',
    paddingHorizontal: 12,
    height: 42,
  },
  primaryBtn: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 14,
    borderRadius: 10,
    height: 42,
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
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef3ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  roleBadgeText: { color: '#0d6efd', fontWeight: '700', fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#0d6efd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  outlineBtnText: { color: '#0d6efd', fontWeight: '700' },
  dangerBtn: {
    borderWidth: 1,
    borderColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dangerBtnText: { color: '#dc3545', fontWeight: '700' },
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
  label: { fontWeight: '700', color: '#1b2a4a', marginTop: 4, marginBottom: 6 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  optionBtn: { borderWidth: 1, borderColor: '#ccd6eb', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  optionBtnActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  optionText: { color: '#344563', fontWeight: '700', fontSize: 12 },
  optionTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
});
