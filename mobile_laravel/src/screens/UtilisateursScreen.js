import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  ActivityIndicator, Modal, Alert, ScrollView, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/backend';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, BottomBar } from '../components/MobileShell';

const ROLE_META = {
  SUPERADMIN:  { label: 'Super Admin', color: '#7c3aed', bg: '#f3e8ff' },
  PROPRIETAIRE:{ label: 'Propriétaire', color: '#0d6efd', bg: '#e8f1ff' },
  SECRETAIRE:  { label: 'Secrétaire',  color: '#0dcaf0', bg: '#e4f9fd' },
  TAILLEUR:    { label: 'Tailleur',    color: '#198754', bg: '#e9f7ef' },
};

const emptyForm = {
  nom: '', prenom: '', email: '', telephone: '', motdepasse: '', role: '', atelierId: '',
};

const emptyPwd = { currentPassword: '', newPassword: '', confirmPassword: '' };

const initials = (u) =>
  `${(u?.prenom || '').charAt(0)}${(u?.nom || '').charAt(0)}`.toUpperCase();

export default function UtilisateursScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [users, setUsers]       = useState([]);
  const [ateliers, setAteliers] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ ...emptyForm, id: null });
  const [pwdForm, setPwdForm]   = useState({ ...emptyPwd, targetId: null });
  const [pwdLoading, setPwdLoading] = useState(false);

  const role     = (userData?.role || '').toUpperCase();
  const userId   = userData?.userId || userData?.id;
  const atelierId = userData?.atelierId || userData?.atelier?.id || '';
  const apiBase  = process.env.EXPO_PUBLIC_API_BASE_URL || '';

  const canManageUsers = ['SUPERADMIN', 'PROPRIETAIRE'].includes(role);

  const availableRoles = useMemo(() => {
    if (role === 'SUPERADMIN') return ['SUPERADMIN', 'PROPRIETAIRE', 'SECRETAIRE', 'TAILLEUR'];
    if (role === 'PROPRIETAIRE') return ['SECRETAIRE', 'TAILLEUR'];
    return [role];
  }, [role]);

  const loadAteliers = async () => {
    if (!userData) return;
    try {
      if (role === 'PROPRIETAIRE' && atelierId) {
        const res = await api.get(`/ateliers/${atelierId}`);
        setAteliers(res.data ? [res.data] : []);
      } else if (role === 'SUPERADMIN') {
        const res = await api.get('/ateliers');
        setAteliers(Array.isArray(res.data) ? res.data : []);
      }
    } catch { setAteliers([]); }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/utilisateurs');
      let data = Array.isArray(res.data) ? res.data : [];
      if (role === 'PROPRIETAIRE') {
        data = data.filter((u) => {
          if (u.id === userId) return true;
          return (u.atelierId) === atelierId && ['TAILLEUR', 'SECRETAIRE'].includes(u.role);
        });
      } else if (['SECRETAIRE', 'TAILLEUR'].includes(role)) {
        data = data.filter((u) => u.id === userId);
      }
      setUsers(data);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('userData');
      setUserData(raw ? JSON.parse(raw) : null);
    })();
  }, []);

  useEffect(() => {
    if (!userData) return;
    loadUsers();
    loadAteliers();
  }, [userData]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const t = search.trim().toLowerCase();
    return users.filter((u) =>
      `${u.prenom} ${u.nom} ${u.email} ${u.telephone || ''}`.toLowerCase().includes(t)
    );
  }, [users, search]);

  const resetAdd = () => setFormData({ ...emptyForm, role: role === 'PROPRIETAIRE' ? 'SECRETAIRE' : '', atelierId: role === 'PROPRIETAIRE' ? atelierId : '' });

  const openAdd = () => { resetAdd(); setShowAdd(true); };

  const openEdit = (u) => {
    setEditForm({ id: u.id, nom: u.nom || '', prenom: u.prenom || '', email: u.email || '', telephone: u.telephone || '', motdepasse: '', role: u.role || '', atelierId: u.atelierId || '' });
    setShowEdit(true);
  };

  const openPwd = (u) => {
    const isSelf = u.id === userId;
    setPwdForm({ ...emptyPwd, targetId: u.id, isSelf });
    setShowPwd(true);
  };

  const handleAddSubmit = async () => {
    const { nom, prenom, telephone, motdepasse, role: r } = formData;
    if (!nom || !prenom || !telephone || !motdepasse || !r) {
      Alert.alert('Erreur', 'Nom, prénom, téléphone, mot de passe et rôle sont obligatoires.');
      return;
    }
    if (role === 'PROPRIETAIRE' && ['PROPRIETAIRE', 'SUPERADMIN'].includes(r)) {
      Alert.alert('Erreur', "Vous ne pouvez pas attribuer ce rôle.");
      return;
    }
    try {
      const payload = { nom, prenom, telephone, motdepasse, role: r };
      if (formData.email) payload.email = formData.email;
      payload.atelier_id = role === 'PROPRIETAIRE' ? atelierId : (formData.atelierId || undefined);
      await api.post('/utilisateurs', payload);
      setShowAdd(false);
      resetAdd();
      loadUsers();
      Alert.alert('Succès', 'Utilisateur ajouté avec succès.');
    } catch (e) { Alert.alert('Erreur', e?.response?.data?.message || "Impossible d'ajouter l'utilisateur."); }
  };

  const handleEditSubmit = async () => {
    if (!editForm.id) return;
    if (!editForm.nom || !editForm.prenom) { Alert.alert('Erreur', 'Nom et prénom obligatoires.'); return; }
    try {
      const payload = { nom: editForm.nom, prenom: editForm.prenom, telephone: editForm.telephone, role: editForm.role };
      if (editForm.email) payload.email = editForm.email;
      const targetAtelierId = role === 'PROPRIETAIRE' ? atelierId : (editForm.atelierId || undefined);
      if (targetAtelierId) payload.atelier_id = targetAtelierId;
      await api.put(`/utilisateurs/${editForm.id}`, payload);
      setShowEdit(false);
      loadUsers();
      Alert.alert('Succès', 'Utilisateur modifié.');
    } catch (e) { Alert.alert('Erreur', e?.response?.data?.message || 'Modification impossible.'); }
  };

  const handlePwdSubmit = async () => {
    const { targetId, currentPassword, newPassword, confirmPassword, isSelf } = pwdForm;
    if (isSelf && !currentPassword) { Alert.alert('Erreur', 'Entrez votre mot de passe actuel.'); return; }
    if (!newPassword || newPassword.length < 4) { Alert.alert('Erreur', 'Nouveau mot de passe : 4 caractères minimum.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.'); return; }
    try {
      setPwdLoading(true);
      await api.post(`/utilisateurs/${targetId}/password`, { currentPassword: isSelf ? currentPassword : 'admin', newPassword, confirmPassword });
      setShowPwd(false);
      Alert.alert('Succès', 'Mot de passe modifié.');
    } catch (e) { Alert.alert('Erreur', e?.response?.data?.message || 'Modification impossible.'); }
    finally { setPwdLoading(false); }
  };

  const handleToggleActif = (u) => {
    const action = u.actif ? 'désactiver' : 'activer';
    Alert.alert('Confirmation', `Voulez-vous ${action} ${u.prenom} ${u.nom} ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        onPress: async () => {
          try {
            const endpoint = u.actif ? `/utilisateurs/${u.id}/deactivate` : `/utilisateurs/${u.id}/activate`;
            await api.patch(endpoint);
            loadUsers();
          } catch (e) { Alert.alert('Erreur', e?.response?.data?.message || 'Action impossible.'); }
        },
      },
    ]);
  };

  const handleDelete = (id) => {
    Alert.alert('Suppression', 'Supprimer cet utilisateur ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/utilisateurs/${id}`); loadUsers(); }
          catch (e) { Alert.alert('Erreur', e?.response?.data?.message || 'Suppression impossible.'); }
        },
      },
    ]);
  };

  const canEditUser   = (u) => role === 'SUPERADMIN' || (role === 'PROPRIETAIRE' && (u.id === userId || ['TAILLEUR', 'SECRETAIRE'].includes(u.role))) || u.id === userId;
  const canDeleteUser = (u) => (role === 'SUPERADMIN' || role === 'PROPRIETAIRE') && u.id !== userId;
  const canToggle     = (u) => (role === 'SUPERADMIN' || role === 'PROPRIETAIRE') && u.id !== userId;

  const renderAvatar = (item) => {
    const photoUrl = item.photoPath ? `${apiBase.replace('/api', '')}/storage/${item.photoPath}` : null;
    if (photoUrl) {
      return <Image source={{ uri: photoUrl }} style={styles.avatar} />;
    }
    return (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarText}>{initials(item)}</Text>
      </View>
    );
  };

  const renderCard = ({ item }) => {
    const rm = ROLE_META[item.role] || { label: item.role, color: '#6c757d', bg: '#f2f4f7' };
    return (
      <View style={[styles.card, !item.actif && styles.cardInactif]}>
        <View style={styles.cardHeader}>
          {renderAvatar(item)}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.cardTitle}>{item.prenom} {item.nom}</Text>
            {item.telephone ? <Text style={styles.cardSub}>📞 {item.telephone}</Text> : null}
            {item.email ? <Text style={styles.cardSub}>✉ {item.email}</Text> : null}
            {item.atelierNom ? <Text style={styles.cardSub}>🏠 {item.atelierNom}</Text> : null}
            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: rm.bg }]}>
                <Text style={[styles.roleBadgeText, { color: rm.color }]}>{rm.label}</Text>
              </View>
              <View style={[styles.actifBadge, { backgroundColor: item.actif ? '#eafaf1' : '#fdecee', borderColor: item.actif ? '#b2d8bc' : '#f1aeb5' }]}>
                <Text style={[styles.actifBadgeText, { color: item.actif ? '#198754' : '#dc3545' }]}>
                  {item.actif ? 'Actif' : 'Inactif'}
                </Text>
              </View>
            </View>
          </View>
          {canToggle(item) ? (
            <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: item.actif ? '#dc3545' : '#198754' }]} onPress={() => handleToggleActif(item)}>
              <Ionicons name={item.actif ? 'power-outline' : 'power'} size={16} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>

        {(canEditUser(item) || canDeleteUser(item)) ? (
          <View style={styles.actionsRow}>
            {canEditUser(item) ? (
              <TouchableOpacity style={styles.outlineBtn} onPress={() => openEdit(item)}>
                <Text style={styles.outlineBtnText}>Modifier</Text>
              </TouchableOpacity>
            ) : null}
            {canEditUser(item) ? (
              <TouchableOpacity style={styles.pwdBtn} onPress={() => openPwd(item)}>
                <Text style={styles.pwdBtnText}>MDP</Text>
              </TouchableOpacity>
            ) : null}
            {canDeleteUser(item) ? (
              <TouchableOpacity style={styles.dangerBtn} onPress={() => handleDelete(item.id)}>
                <Text style={styles.dangerBtnText}>Supprimer</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.page}>
      <AppHeader navigation={navigation} title="Utilisateurs" subtitle="Gestion des comptes" showBack />

      <View style={styles.searchRow}>
        <TextInput style={styles.searchInput} placeholder="Rechercher…" value={search} onChangeText={setSearch} />
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
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Aucun utilisateur trouvé.</Text> : null}
        renderItem={renderCard}
      />

      {/* ── MODAL AJOUTER ── */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Ajouter un utilisateur</Text>

              {[
                { label: 'Prénom *', key: 'prenom', placeholder: 'Prénom' },
                { label: 'Nom *', key: 'nom', placeholder: 'Nom' },
                { label: 'Téléphone *', key: 'telephone', placeholder: '6X XXX XXX', keyboardType: 'phone-pad' },
                { label: 'Email (optionnel)', key: 'email', placeholder: 'email@exemple.com', keyboardType: 'email-address', autoCapitalize: 'none' },
                { label: 'Mot de passe *', key: 'motdepasse', placeholder: '••••••', secureTextEntry: true },
              ].map(({ label, key, ...rest }) => (
                <View key={key}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <TextInput style={styles.input} value={formData[key]} onChangeText={(v) => setFormData({ ...formData, [key]: v })} placeholder={rest.placeholder} {...rest} />
                </View>
              ))}

              <Text style={styles.inputLabel}>Rôle *</Text>
              <View style={styles.optionRow}>
                {availableRoles.map((r) => (
                  <TouchableOpacity key={r} style={[styles.optionBtn, formData.role === r && styles.optionBtnActive]} onPress={() => setFormData({ ...formData, role: r })}>
                    <Text style={[styles.optionText, formData.role === r && styles.optionTextActive]}>{ROLE_META[r]?.label || r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {role === 'SUPERADMIN' ? (
                <>
                  <Text style={styles.inputLabel}>Atelier</Text>
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
                <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowAdd(false)}><Text style={styles.outlineBtnText}>Annuler</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleAddSubmit}><Text style={styles.primaryBtnText}>Enregistrer</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL MODIFIER ── */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Modifier l'utilisateur</Text>

              {[
                { label: 'Prénom', key: 'prenom', placeholder: 'Prénom' },
                { label: 'Nom', key: 'nom', placeholder: 'Nom' },
                { label: 'Téléphone', key: 'telephone', placeholder: '6X XXX XXX', keyboardType: 'phone-pad' },
                { label: 'Email', key: 'email', placeholder: 'email@exemple.com', keyboardType: 'email-address', autoCapitalize: 'none' },
              ].map(({ label, key, ...rest }) => (
                <View key={key}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <TextInput style={styles.input} value={editForm[key]} onChangeText={(v) => setEditForm({ ...editForm, [key]: v })} placeholder={rest.placeholder} {...rest} />
                </View>
              ))}

              {canManageUsers ? (
                <>
                  <Text style={styles.inputLabel}>Rôle</Text>
                  <View style={styles.optionRow}>
                    {availableRoles.map((r) => (
                      <TouchableOpacity key={r} style={[styles.optionBtn, editForm.role === r && styles.optionBtnActive]} onPress={() => setEditForm({ ...editForm, role: r })}>
                        <Text style={[styles.optionText, editForm.role === r && styles.optionTextActive]}>{ROLE_META[r]?.label || r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              {role === 'SUPERADMIN' ? (
                <>
                  <Text style={styles.inputLabel}>Atelier</Text>
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
                <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowEdit(false)}><Text style={styles.outlineBtnText}>Annuler</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleEditSubmit}><Text style={styles.primaryBtnText}>Enregistrer</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL MOT DE PASSE ── */}
      <Modal visible={showPwd} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Changer le mot de passe</Text>

              {pwdForm.isSelf ? (
                <>
                  <Text style={styles.inputLabel}>Mot de passe actuel *</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="Mot de passe actuel" value={pwdForm.currentPassword} onChangeText={(v) => setPwdForm({ ...pwdForm, currentPassword: v })} />
                </>
              ) : null}

              <Text style={styles.inputLabel}>Nouveau mot de passe *</Text>
              <TextInput style={styles.input} secureTextEntry placeholder="Nouveau mot de passe" value={pwdForm.newPassword} onChangeText={(v) => setPwdForm({ ...pwdForm, newPassword: v })} />

              <Text style={styles.inputLabel}>Confirmer le mot de passe *</Text>
              <TextInput style={styles.input} secureTextEntry placeholder="Confirmez le mot de passe" value={pwdForm.confirmPassword} onChangeText={(v) => setPwdForm({ ...pwdForm, confirmPassword: v })} />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowPwd(false)}><Text style={styles.outlineBtnText}>Annuler</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, pwdLoading && { opacity: 0.7 }]} onPress={handlePwdSubmit} disabled={pwdLoading}>
                  <Text style={styles.primaryBtnText}>{pwdLoading ? '…' : 'Modifier'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BottomBar navigation={navigation} active="Utilisateurs" />
    </View>
  );
}

const styles = StyleSheet.create({
  page:       { flex: 1, backgroundColor: '#f6f8fb' },
  searchRow:  { flexDirection: 'row', padding: 12, gap: 8 },
  searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5eaf3', paddingHorizontal: 12, height: 42 },
  primaryBtn: { backgroundColor: '#0d6efd', paddingHorizontal: 14, borderRadius: 10, height: 42, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  emptyText:  { textAlign: 'center', color: '#66758f', marginTop: 20 },

  card: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5eaf3',
    borderRadius: 14, marginBottom: 10, padding: 12,
    elevation: 2, shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  cardInactif: { opacity: 0.7, borderColor: '#f1aeb5' },
  cardHeader:  { flexDirection: 'row', alignItems: 'center' },
  avatar:      { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0d6efd', alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#fff', fontWeight: '900', fontSize: 16 },
  cardTitle:   { fontWeight: '900', color: '#1d2c4d', fontSize: 15 },
  cardSub:     { color: '#6b7a95', fontSize: 12, marginTop: 2 },
  badgeRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  roleBadge:   { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  roleBadgeText: { fontWeight: '800', fontSize: 11 },
  actifBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  actifBadgeText: { fontWeight: '800', fontSize: 11 },
  toggleBtn:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  actionsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  outlineBtn:  { borderWidth: 1, borderColor: '#0d6efd', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  outlineBtnText: { color: '#0d6efd', fontWeight: '700' },
  pwdBtn:      { borderWidth: 1, borderColor: '#f59f00', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  pwdBtnText:  { color: '#f59f00', fontWeight: '700' },
  dangerBtn:   { borderWidth: 1, borderColor: '#dc3545', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  dangerBtnText: { color: '#dc3545', fontWeight: '700' },

  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  modalCard:  { backgroundColor: '#fff', borderRadius: 14, padding: 16, maxHeight: '88%' },
  modalTitle: { fontSize: 17, fontWeight: '900', marginBottom: 12, color: '#1b2a4a' },
  inputLabel: { fontWeight: '700', color: '#1b2a4a', marginBottom: 5, marginTop: 4 },
  input: {
    backgroundColor: '#f8f9fc', borderWidth: 1, borderColor: '#e5eaf3',
    borderRadius: 10, paddingHorizontal: 12, height: 44, marginBottom: 10,
  },
  optionRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  optionBtn:  { borderWidth: 1, borderColor: '#ccd6eb', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  optionBtnActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  optionText: { color: '#344563', fontWeight: '700', fontSize: 12 },
  optionTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
});
