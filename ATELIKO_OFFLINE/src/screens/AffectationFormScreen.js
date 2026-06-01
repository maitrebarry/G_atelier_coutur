import React, {useEffect, useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, View, ToastAndroid} from 'react-native';
import AppButton from '../components/AppButton';
import FormInput from '../components/FormInput';
import {getClientDetails, listClients} from '../services/clientService';
import {addAffectation} from '../services/tailleurService';

export default function AffectationFormScreen({route, navigation}) {
  const {idTailleur} = route.params;
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [clientDetails, setClientDetails] = useState(null);
  const [form, setForm] = useState({id_mesure: '', prix_tailleur: '', statut: 'EN_ATTENTE', date_echeance: ''});

  useEffect(() => {
    listClients().then(setClients);
  }, []);

  useEffect(() => {
    if (!clientId) {
      setClientDetails(null);
      return;
    }
    getClientDetails(Number(clientId)).then(setClientDetails);
  }, [clientId]);

  const set = (field, value) => setForm(prev => ({...prev, [field]: value}));
  const save = async () => {
    if (!clientId || !form.prix_tailleur) {
      Alert.alert('Validation', 'Choisissez un client et indiquez le prix tailleur.');
      return;
    }
    try {
      await addAffectation({
        id_tailleur: idTailleur,
        id_client: Number(clientId),
        id_mesure: form.id_mesure ? Number(form.id_mesure) : null,
        prix_tailleur: form.prix_tailleur,
        statut: form.statut,
        date_echeance: form.date_echeance || null,
      });
      Alert.alert('Succès', 'Affectation enregistrée avec succès', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'affectation.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Affecter un travail</Text>
      <Text style={styles.label}>Client</Text>
      <View style={styles.wrap}>
        {clients.map(c => {
          const active = String(c.id_client) === String(clientId);
          return (
            <Pressable key={c.id_client} onPress={() => setClientId(String(c.id_client))} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.prenom} {c.nom}</Text>
            </Pressable>
          );
        })}
      </View>
      {clientDetails?.mesures?.length ? (
        <>
          <Text style={styles.label}>Mesure / modele</Text>
          <View style={styles.wrap}>
            {clientDetails.mesures.map(m => {
              const active = String(m.id_mesure) === String(form.id_mesure);
              return (
                <Pressable key={m.id_mesure} onPress={() => set('id_mesure', String(m.id_mesure))} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.type_vetement || 'Mesure'} #{m.id_mesure}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
      <FormInput label="Prix tailleur" value={form.prix_tailleur} onChangeText={v => set('prix_tailleur', v)} numeric />
      <FormInput label="Date echeance (YYYY-MM-DD)" value={form.date_echeance} onChangeText={v => set('date_echeance', v)} />
      <Text style={styles.label}>Statut</Text>
      <View style={styles.wrap}>
        {['EN_ATTENTE', 'EN_COURS', 'TERMINE', 'VALIDE'].map(statut => (
          <Pressable key={statut} onPress={() => set('statut', statut)} style={[styles.chip, form.statut === statut && styles.chipActive]}>
            <Text style={[styles.chipText, form.statut === statut && styles.chipTextActive]}>{statut}</Text>
          </Pressable>
        ))}
      </View>
      <AppButton label="Enregistrer affectation" onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, backgroundColor: '#f8fafc', flexGrow: 1},
  title: {fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 12},
  label: {fontSize: 13, color: '#334155', fontWeight: '800', marginBottom: 8},
  wrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12},
  chip: {borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff'},
  chipActive: {backgroundColor: '#0f766e', borderColor: '#0f766e'},
  chipText: {fontWeight: '800', color: '#334155', fontSize: 12},
  chipTextActive: {color: '#fff'},
});
