import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import api from '../api/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MesureAddScreen({ navigation }) {
  const [formData, setFormData] = useState({
    nom: '', prenom: '', contact: '', adresse: '', email: '',
    sexe: 'Femme', femme_type: 'Robe',
    // Mesures communes / spécifiques
    robe_epaule: '', robe_manche: '', robe_poitrine: '', robe_taille: '', robe_longueur: '',
    jupe_taille: '', jupe_longueur: '', jupe_fesse: '',
    homme_epaule: '', homme_manche: '', homme_longueur_pantalon: '', homme_poitrine: '',
  });

  const handleChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

  const handleSubmit = async () => {
    if (!formData.nom || !formData.prenom || !formData.contact) return Alert.alert('Erreur', 'Nom, Prénom et Contact requis');
    
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('userData')) || {};
      const atelierId = userData.atelierId || userData.id; // Fallback
      
      const payload = new FormData();
      Object.keys(formData).forEach(k => {
        if (formData[k]) payload.append(k, formData[k]);
      });
      // Ajout atelierId si requis par l'API (souvent l'API le déduit du token ou user context, mais Mesures.jsx ne l'envoie pas explicitement dans formData, il est dans le token)
      
      // Note: L'API web attend 'photo' si fichier. Ici on simplifie sans photo pour l'instant ou on l'ajoutera plus tard.
      
      await api.post('/clients/ajouter', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      Alert.alert('Succès', 'Client et mesures enregistrés');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', 'Echec de l\'enregistrement');
    }
  };

  const renderInput = (label, field, numeric = false) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput 
        style={styles.input} 
        value={formData[field]} 
        onChangeText={t => handleChange(field, t)} 
        keyboardType={numeric ? 'numeric' : 'default'}
      />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nouveau Client & Mesures</Text>
      
      <Text style={styles.section}>Infos Client</Text>
      {renderInput('Nom', 'nom')}
      {renderInput('Prénom', 'prenom')}
      {renderInput('Contact', 'contact', true)}
      {renderInput('Adresse', 'adresse')}
      {renderInput('Email', 'email')}
      
      <View style={styles.field}>
        <Text style={styles.label}>Sexe</Text>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => handleChange('sexe', 'Femme')} style={[styles.choice, formData.sexe === 'Femme' && styles.selected]}>
            <Text style={formData.sexe === 'Femme' ? styles.white : styles.black}>Femme</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleChange('sexe', 'Homme')} style={[styles.choice, formData.sexe === 'Homme' && styles.selected]}>
            <Text style={formData.sexe === 'Homme' ? styles.white : styles.black}>Homme</Text>
          </TouchableOpacity>
        </View>
      </View>

      {formData.sexe === 'Femme' && (
        <View style={styles.field}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={() => handleChange('femme_type', 'Robe')} style={[styles.choice, formData.femme_type === 'Robe' && styles.selected]}>
              <Text style={formData.femme_type === 'Robe' ? styles.white : styles.black}>Robe</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleChange('femme_type', 'Jupe')} style={[styles.choice, formData.femme_type === 'Jupe' && styles.selected]}>
              <Text style={formData.femme_type === 'Jupe' ? styles.white : styles.black}>Jupe</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.section}>Mesures ({formData.sexe === 'Femme' ? formData.femme_type : 'Homme'})</Text>
      
      {formData.sexe === 'Femme' && formData.femme_type === 'Robe' && (
        <>
          {renderInput('Épaule', 'robe_epaule', true)}
          {renderInput('Manche', 'robe_manche', true)}
          {renderInput('Poitrine', 'robe_poitrine', true)}
          {renderInput('Taille', 'robe_taille', true)}
          {renderInput('Longueur', 'robe_longueur', true)}
        </>
      )}

      {formData.sexe === 'Femme' && formData.femme_type === 'Jupe' && (
        <>
          {renderInput('Taille', 'jupe_taille', true)}
          {renderInput('Longueur', 'jupe_longueur', true)}
          {renderInput('Fesse', 'jupe_fesse', true)}
        </>
      )}

      {formData.sexe === 'Homme' && (
        <>
          {renderInput('Épaule', 'homme_epaule', true)}
          {renderInput('Manche', 'homme_manche', true)}
          {renderInput('Poitrine', 'homme_poitrine', true)}
          {renderInput('Pantalon (Long.)', 'homme_longueur_pantalon', true)}
        </>
      )}

      <Button title="Enregistrer" onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, marginBottom: 16, fontWeight: 'bold' },
  section: { fontSize: 16, marginTop: 16, marginBottom: 8, fontWeight: '600', color: '#555' },
  field: { marginBottom: 12 },
  label: { marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 10 },
  choice: { padding: 8, borderWidth: 1, borderColor: '#0d6efd', borderRadius: 4 },
  selected: { backgroundColor: '#0d6efd' },
  white: { color: '#fff' },
  black: { color: '#000' }
});
