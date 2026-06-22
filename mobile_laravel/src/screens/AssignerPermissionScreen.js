import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/backend';

export default function AssignerPermissionScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState(new Set());
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const role = (userData?.role || '').toUpperCase();
  const userId = userData?.userId || userData?.id;
  const atelierId = userData?.atelierId || userData?.atelier?.id || '';
  const canAccess = ['SUPERADMIN', 'PROPRIETAIRE'].includes(role);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/utilisateurs');
      let data = Array.isArray(res.data) ? res.data : [];
      if (role === 'PROPRIETAIRE') {
        data = data.filter((u) => {
          if (u.id === userId) return false;
          const sameAtelier = (u.atelier?.id || u.atelierId) === atelierId;
          return sameAtelier && ['TAILLEUR', 'SECRETAIRE', 'PROPRIETAIRE'].includes(u.role);
        });
      }
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAllPermissions = async () => {
    setLoadingPermissions(true);
    try {
      const res = await api.get('/admin/permissions');
      setPermissions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const loadUserPermissions = async (user) => {
    try {
      if (!permissions.length) await loadAllPermissions();
      const res = await api.get(`/admin/utilisateurs/${user.id}/permissions`);
      let perms = Array.isArray(res.data) ? res.data.map((p) => p.id) : [];

      if ((user.role === 'PROPRIETAIRE' || user.role === 'SUPERADMIN') && perms.length === 0) {
        const ids = permissions.map((p) => p.id);
        perms = ids;
      }
      setUserPermissions(new Set(perms));
    } catch {
      setUserPermissions(new Set());
    }
  };

  const handleUserSelect = async (user) => {
    if (role === 'PROPRIETAIRE' && user.role === 'SUPERADMIN') {
      Alert.alert('Erreur', 'Vous ne pouvez pas gérer les permissions de cet utilisateur');
      return;
    }
    setSelectedUser(user);
    await loadUserPermissions(user);
  };

  const groupedPermissions = useMemo(() => {
    const groups = {};
    permissions.forEach((p) => {
      const module = String(p.code || 'AUTRE').split('_')[0];
      if (!groups[module]) groups[module] = [];
      groups[module].push(p);
    });
    return groups;
  }, [permissions]);

  const togglePermission = (permId) => {
    setUserPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleModule = (module) => {
    const modulePerms = groupedPermissions[module] || [];
    const allChecked = modulePerms.every((p) => userPermissions.has(p.id));
    setUserPermissions((prev) => {
      const next = new Set(prev);
      modulePerms.forEach((p) => {
        if (allChecked) next.delete(p.id);
        else next.add(p.id);
      });
      return next;
    });
  };

  const clearAll = () => setUserPermissions(new Set());

  const handleSave = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      const ids = Array.from(userPermissions);
      await api.post(`/admin/utilisateurs/${selectedUser.id}/permissions`, ids);
      Alert.alert('Succès', 'Les permissions ont été mises à jour avec succès !');
      // Recharger les permissions pour vérifier la mise à jour
      await loadUserPermissions(selectedUser);
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.error || "Impossible de sauvegarder");
    } finally {
      setSaving(false);
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
    if (!canAccess) return;
    loadUsers();
    loadAllPermissions();
  }, [canAccess, role]);

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      String(u.nom || '').toLowerCase().includes(term) ||
      String(u.prenom || '').toLowerCase().includes(term) ||
      String(u.email || '').toLowerCase().includes(term)
    );
  });

  return (
    <View style={styles.page}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Assigner Permission</Text>
        <View style={{ width: 34 }} />
      </View>

      {!canAccess ? (
        <View style={styles.noPermissionBox}>
          <Text style={styles.noPermissionText}>Accès réservé aux administrateurs.</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <View style={styles.columns}>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Utilisateurs</Text>
              {loadingUsers ? <ActivityIndicator style={{ marginVertical: 8 }} /> : null}
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => String(item.id)}
                style={{ maxHeight: 320 }}
                ListEmptyComponent={!loadingUsers ? <Text style={styles.emptyText}>Aucun utilisateur</Text> : null}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.userItem, selectedUser?.id === item.id && styles.userItemActive]}
                    onPress={() => handleUserSelect(item)}
                  >
                    <Text style={[styles.userName, selectedUser?.id === item.id && styles.userNameActive]}>
                      {item.prenom} {item.nom}
                    </Text>
                    <Text style={[styles.userEmail, selectedUser?.id === item.id && styles.userEmailActive]}>{item.email}</Text>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>{item.role}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>

            <View style={styles.column}>
              <Text style={styles.sectionTitle}>
                Permissions {selectedUser ? `• ${selectedUser.prenom} ${selectedUser.nom}` : ''}
              </Text>

              {loadingPermissions ? <ActivityIndicator style={{ marginVertical: 8 }} /> : null}

              {!selectedUser ? (
                <Text style={styles.emptyText}>Sélectionnez un utilisateur</Text>
              ) : (
                <ScrollView style={{ maxHeight: 420 }}>
                  {Object.keys(groupedPermissions).sort().map((module) => {
                    const modulePerms = groupedPermissions[module] || [];
                    const allChecked = modulePerms.every((p) => userPermissions.has(p.id));
                    const someChecked = modulePerms.some((p) => userPermissions.has(p.id));

                    return (
                      <View key={module} style={styles.moduleCard}>
                        <TouchableOpacity style={styles.moduleHeader} onPress={() => toggleModule(module)}>
                          <Text style={styles.moduleTitle}>Module {module}</Text>
                          <Text style={styles.moduleSelect}>{allChecked ? 'Tout désélectionner' : someChecked ? 'Sélection partielle' : 'Tout sélectionner'}</Text>
                        </TouchableOpacity>
                        {modulePerms.map((perm) => (
                          <TouchableOpacity key={perm.id} style={styles.permRow} onPress={() => togglePermission(perm.id)}>
                            <View style={[styles.checkbox, userPermissions.has(perm.id) && styles.checkboxChecked]}>
                              {userPermissions.has(perm.id) && <Text style={styles.checkboxTick}>✓</Text>}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.permCode}>{perm.code}</Text>
                              <Text style={styles.permDesc}>{perm.description}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                </ScrollView>
              )}

              {selectedUser ? (
                <View style={styles.footerActions}>
                  <Text style={styles.counterText}>{userPermissions.size} permission(s)</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={styles.outlineBtn} onPress={clearAll}>
                      <Text style={styles.outlineBtnText}>Tout désélectionner</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} disabled={saving}>
                      <Text style={styles.primaryBtnText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      )}
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
  searchRow: { padding: 12 },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5eaf3',
    paddingHorizontal: 12,
    height: 42,
  },
  columns: { flex: 1, paddingHorizontal: 12 },
  column: { marginBottom: 16 },
  sectionTitle: { fontWeight: '900', color: '#1b2a4a', marginBottom: 6 },
  userItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5eaf3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  userItemActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  userName: { fontWeight: '800', color: '#1d2c4d' },
  userNameActive: { color: '#fff' },
  userEmail: { color: '#6b7a95', marginTop: 2, fontSize: 12 },
  userEmailActive: { color: '#e2e8f6' },
  roleBadge: { alignSelf: 'flex-start', backgroundColor: '#eef3ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 6 },
  roleBadgeText: { color: '#0d6efd', fontWeight: '700', fontSize: 12 },
  moduleCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5eaf3', borderRadius: 12, marginBottom: 10 },
  moduleHeader: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eef0f4' },
  moduleTitle: { fontWeight: '800', color: '#1b2a4a' },
  moduleSelect: { color: '#6b7a95', fontSize: 12, marginTop: 2 },
  permRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: '#c7d1e8', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  checkboxTick: { color: '#fff', fontWeight: '800' },
  permCode: { fontWeight: '700', color: '#1d2c4d' },
  permDesc: { color: '#6b7a95', fontSize: 12, marginTop: 2 },
  footerActions: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counterText: { color: '#6b7a95', fontWeight: '700' },
  outlineBtn: { borderWidth: 1, borderColor: '#0d6efd', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  outlineBtnText: { color: '#0d6efd', fontWeight: '700', fontSize: 12 },
  primaryBtn: { backgroundColor: '#0d6efd', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  noPermissionBox: { margin: 16, backgroundColor: '#fff3f3', borderRadius: 12, borderWidth: 1, borderColor: '#ffd6d6', padding: 14 },
  noPermissionText: { color: '#a52a2a', fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#66758f', marginTop: 10 },
});
