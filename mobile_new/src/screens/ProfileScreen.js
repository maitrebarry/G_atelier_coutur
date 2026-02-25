import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Button, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/backend';

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const userData = JSON.parse(await AsyncStorage.getItem('userData')) || {};
        const res = await api.get(`/utilisateurs/${userData.id}/profile`);
        setProfile(res.data || userData);
      } catch (e) {
        const userData = JSON.parse(await AsyncStorage.getItem('userData')) || {};
        setProfile(userData);
      }
    })();
  }, []);

  const pickImageAndUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission refusée');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      if (result.cancelled) return;

      const uri = result.assets ? result.assets[0].uri : result.uri;
      const userData = JSON.parse(await AsyncStorage.getItem('userData')) || {};
      const form = new FormData();
      const filename = uri.split('/').pop();
      const match = filename.match(/\.([0-9a-z]+)$/i);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      form.append('file', { uri, name: filename, type });

      await api.post(`/utilisateurs/${userData.id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      // refresh profile
      const res = await api.get(`/utilisateurs/${userData.id}/profile`);
      const updated = res.data || {};
      setProfile(updated);
      // persist userData avatar if available
      const newUserData = { ...userData, photoPath: updated.photoPath || updated.avatar, avatar: updated.photoUrl || updated.avatar };
      await AsyncStorage.setItem('userData', JSON.stringify(newUserData));
      Alert.alert('OK', 'Photo de profil mise à jour');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\u2019uploader la photo');
    }
  };

  return (
    <View style={styles.container}>
      {profile ? (
        <>
          <Image source={{ uri: profile.photoUrl || profile.avatar || undefined }} style={styles.avatar} />
          <Text style={styles.name}>{profile.nom || profile.prenom || profile.username}</Text>
          <View style={{height:12}} />
          <Button title="Changer la photo" onPress={pickImageAndUpload} />
        </>
      ) : (
        <Text>Chargement...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 12, backgroundColor: '#eee' },
  name: { fontSize: 18 },
});
