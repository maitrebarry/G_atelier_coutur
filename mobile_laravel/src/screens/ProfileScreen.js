import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, Alert, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/backend';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });

  const getStoredUserId = async () => {
    const raw = await AsyncStorage.getItem('userData');
    const userData = JSON.parse(raw || '{}') || {};
    return userData.userId || userData.id || null;
  };

  const apiBase = useMemo(() => (api?.defaults?.baseURL || '').replace(/\/?api\/?$/i, ''), []);

  const getImageMediaTypeOption = () => {
    const imageType = ImagePicker?.MediaType?.images || ImagePicker?.MediaType?.Images || 'images';
    return [imageType];
  };

  const buildPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    if (String(photoPath).startsWith('http')) return photoPath;
    if (!apiBase) return null;
    const clean = String(photoPath).replace(/^\/+/, '').replace('user_photo/', '');
    return `${apiBase}/user_photo/${clean}`;
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('userData');
        const userData = JSON.parse(raw || '{}') || {};
        const userId = userData.userId || userData.id;
        if (!userId) throw new Error('Utilisateur introuvable');
        const res = await api.get(`/utilisateurs/${userId}/profile`);
        setProfile(res.data || userData);
      } catch (e) {
        const raw = await AsyncStorage.getItem('userData');
        const userData = JSON.parse(raw || '{}') || {};
        setProfile(userData);
      }
    })();
  }, []);

  const pickImageAndUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission refusée');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: getImageMediaTypeOption(), quality: 0.7 });
      if (result.canceled) return;

      const uri = result.assets ? result.assets[0].uri : result.uri;
      const raw = await AsyncStorage.getItem('userData');
      const userData = JSON.parse(raw || '{}') || {};
      const userId = (await getStoredUserId()) || userData.userId || userData.id;
      if (!userId) return Alert.alert('Erreur', 'Utilisateur introuvable');
      setBusy(true);
      const form = new FormData();
      const filename = uri.split('/').pop();
      const match = filename.match(/\.([0-9a-z]+)$/i);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      form.append('file', { uri, name: filename, type });

      await api.post(`/utilisateurs/${userId}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      // refresh profile
      const res = await api.get(`/utilisateurs/${userId}/profile`);
      const updated = res.data || {};
      setProfile(updated);
      // persist userData avatar if available
      const newUserData = { ...userData, photoPath: updated.photoPath || updated.avatar, avatar: updated.photoUrl || updated.avatar };
      await AsyncStorage.setItem('userData', JSON.stringify(newUserData));
      Alert.alert('OK', 'Photo de profil mise à jour');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\u2019uploader la photo');
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      const userData = JSON.parse(raw || '{}') || {};
      const userId = (await getStoredUserId()) || userData.userId || userData.id;
      if (!userId) return Alert.alert('Erreur', 'Utilisateur introuvable');
      setBusy(true);
      await api.delete(`/utilisateurs/${userId}/photo`);
      const res = await api.get(`/utilisateurs/${userId}/profile`);
      const updated = res.data || {};
      setProfile(updated);
      const newUserData = { ...userData, photoPath: null, avatar: null };
      await AsyncStorage.setItem('userData', JSON.stringify(newUserData));
      Alert.alert('OK', 'Photo supprimée');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de supprimer la photo');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      const userData = JSON.parse(raw || '{}') || {};
      const userId = (await getStoredUserId()) || userData.userId || userData.id;
      if (!userId) return Alert.alert('Erreur', 'Utilisateur introuvable');
      if (!passwords.current || !passwords.next || !passwords.confirm) {
        return Alert.alert('Erreur', 'Tous les champs sont requis');
      }
      if (passwords.next !== passwords.confirm) {
        return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      }
      if (passwords.next.length < 6) {
        return Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      }

      setBusy(true);
      await api.post(`/utilisateurs/${userId}/password`, {
        currentPassword: passwords.current,
        newPassword: passwords.next,
        confirmPassword: passwords.confirm,
      });
      setPasswords({ current: '', next: '', confirm: '' });
      Alert.alert('Succès', 'Mot de passe mis à jour');
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.error || 'Impossible de modifier le mot de passe');
    } finally {
      setBusy(false);
    }
  };

  const displayName = `${profile?.prenom || ''} ${profile?.nom || ''}`.trim() || profile?.username || 'Utilisateur';
  const photoUrl = buildPhotoUrl(profile?.photoPath || profile?.photoUrl || profile?.avatar);

  return (
    <View style={styles.page}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mon profil</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.avatarWrap}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={{ fontSize: 32 }}>👤</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.role}>{profile?.role || '—'}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile?.email || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Atelier</Text>
            <Text style={styles.infoValue}>{profile?.atelier?.nom || profile?.atelier || '—'}</Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={pickImageAndUpload} disabled={busy}>
              <Text style={styles.actionText}>Changer photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={removePhoto} disabled={busy}>
              <Text style={styles.actionText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Changer le mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Mot de passe actuel"
            secureTextEntry
            value={passwords.current}
            onChangeText={(v) => setPasswords((prev) => ({ ...prev, current: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Nouveau mot de passe"
            secureTextEntry
            value={passwords.next}
            onChangeText={(v) => setPasswords((prev) => ({ ...prev, next: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirmer le mot de passe"
            secureTextEntry
            value={passwords.confirm}
            onChangeText={(v) => setPasswords((prev) => ({ ...prev, confirm: v }))}
          />
          <TouchableOpacity style={[styles.actionBtn, styles.successBtn]} onPress={handlePasswordChange} disabled={busy}>
            <Text style={styles.actionText}>Changer mot de passe</Text>
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
  title: { fontSize: 22, fontWeight: '900', color: '#1b2a4a' },
  container: { padding: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9edf5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  avatarWrap: { alignItems: 'center', marginBottom: 8 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee' },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#f1f4fa', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '900', color: '#1d2c4d', textAlign: 'center' },
  role: { color: '#6b7a95', textAlign: 'center', marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  infoLabel: { color: '#6b7a95', fontWeight: '700' },
  infoValue: { color: '#1d2c4d', fontWeight: '800' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '900' },
  primaryBtn: { backgroundColor: '#0d6efd' },
  dangerBtn: { backgroundColor: '#dc3545' },
  successBtn: { backgroundColor: '#198754' },
  sectionTitle: { fontWeight: '900', color: '#203155', marginBottom: 8, fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#dfe5f1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
});
