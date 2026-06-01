import React, {useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View, ToastAndroid} from 'react-native';
import AppButton from '../components/AppButton';
import FormInput from '../components/FormInput';
import PhotoPicker from '../components/PhotoPicker';
import {createModele, updateModele, createAlbum, updateAlbum} from '../services/modelService';

export default function ModeleFormScreen({route, navigation}) {
  const {idClient, modele} = route.params || {};
  const [form, setForm] = useState({
    photo: modele?.photo || '',
    nom_modele: modele?.nom_modele || '',
    prix: String(modele?.prix || ''),
    videoURL: modele?.videoPath || '',
  });

  const set = (field, value) => setForm(prev => ({...prev, [field]: value}));
  const save = async () => {
    if (!form.nom_modele.trim()) {
      Alert.alert('Champ requis', 'Le nom du modèle est obligatoire.');
      return;
    }
    try {
      if (idClient) {
        if (modele?.id_modele) {
          await updateModele(modele.id_modele, { photo: form.photo, nom_modele: form.nom_modele.trim(), prix: form.prix });
          Alert.alert('Succès', 'Modèle mis à jour avec succès', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } else {
          const saved = await createModele({ id_client: idClient, photo: form.photo, nom_modele: form.nom_modele.trim(), prix: form.prix });
          if (saved?.entreeReference) {
            Alert.alert('Succès', 'Modèle créé avec succès', [{ text: 'OK', onPress: () => navigation.replace('Receipt', {receiptType: 'MOUVEMENT', movementReference: saved.entreeReference, autoWhatsApp: true}) }]);
          } else {
            Alert.alert('Succès', 'Modèle créé avec succès', [{ text: 'OK', onPress: () => navigation.goBack() }]);
          }
        }
      } else {
        if (modele?.id_album) {
          await updateAlbum(modele.id_album, { photo: form.photo, nom_modele: form.nom_modele.trim(), prix: form.prix });
          Alert.alert('Succès', 'Album mis à jour avec succès', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } else {
          await createAlbum({ photo: form.photo, nom_modele: form.nom_modele.trim(), prix: form.prix });
          Alert.alert('Succès', 'Album créé avec succès', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        }
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer le modèle.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{modele ? 'Modifier modèle' : 'Nouveau modèle'}</Text>
      <PhotoPicker label="Photo du modèle" value={form.photo} onChange={uri => set('photo', uri)} prefix="modele" />
      <FormInput label="Nom modèle *" value={form.nom_modele} onChangeText={v => set('nom_modele', v)} />
      <FormInput label="Prix (FCFA)" value={form.prix} onChangeText={v => set('prix', v)} numeric />
      <FormInput label="URL vidéo (optionnel)" value={form.videoURL} onChangeText={v => set('videoURL', v)} />
      <View style={{height: 8}} />
      <AppButton label="Enregistrer" onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, backgroundColor: '#f8fafc', flexGrow: 1},
  title: {fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 14},
});
