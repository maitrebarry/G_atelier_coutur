import React, {useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View, Picker, ToastAndroid} from 'react-native';
import AppButton from '../components/AppButton';
import FormInput from '../components/FormInput';
import PhotoPicker from '../components/PhotoPicker';
import {createAlbum, updateAlbum} from '../services/modelService';

// Fallback for native picker since it might not be installed, we use a simple select substitute or TextInput
export default function AlbumFormScreen({route, navigation}) {
  const {album} = route.params || {};
  const [form, setForm] = useState({
    photo: album?.photo || '',
    nom_modele: album?.nom_modele || '',
    description: album?.description || '',
    prix: String(album?.prix || ''),
    categorie: album?.categorie || 'ROBE',
  });

  const set = (field, value) => setForm(prev => ({...prev, [field]: value}));
  
  const save = async () => {
    if (!form.nom_modele.trim()) {
      Alert.alert('Champ requis', 'Le nom du modèle est obligatoire.');
      return;
    }
    if (!form.categorie.trim()) {
      Alert.alert('Champ requis', 'La catégorie est obligatoire.');
      return;
    }
    try {
      if (album?.id_album) {
        await updateAlbum(album.id_album, { 
          photo: form.photo, 
          nom_modele: form.nom_modele.trim(), 
          description: form.description.trim(),
          prix: form.prix,
          categorie: form.categorie
        });
        Alert.alert('Succès', 'Album modifié avec succès');
      } else {
        await createAlbum({ 
          photo: form.photo, 
          nom_modele: form.nom_modele.trim(), 
          description: form.description.trim(),
          prix: form.prix,
          categorie: form.categorie
        });
        Alert.alert('Succès', 'Album créé avec succès');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'album.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{album ? 'Modifier album' : 'Nouvel album'}</Text>
      <PhotoPicker label="Photo du modèle" value={form.photo} onChange={uri => set('photo', uri)} prefix="album" />
      <FormInput label="Nom modèle *" value={form.nom_modele} onChangeText={v => set('nom_modele', v)} />
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Catégorie *</Text>
        <View style={styles.categoryWrap}>
          {['ROBE', 'JUPE', 'HOMME', 'ENFANT', 'AUTRE'].map(cat => (
            <AppButton 
              key={cat} 
              label={cat} 
              onPress={() => set('categorie', cat)} 
              variant={form.categorie === cat ? 'primary' : 'muted'} 
            />
          ))}
        </View>
      </View>

      <FormInput label="Description" value={form.description} onChangeText={v => set('description', v)} multiline />
      <FormInput label="Prix de convention (FCFA)" value={form.prix} onChangeText={v => set('prix', v)} numeric />
      
      <View style={{height: 16}} />
      <AppButton label="Enregistrer" onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, backgroundColor: '#f8fafc', flexGrow: 1},
  title: {fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 14},
  inputGroup: {marginBottom: 16},
  label: {fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 6},
  categoryWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
});
