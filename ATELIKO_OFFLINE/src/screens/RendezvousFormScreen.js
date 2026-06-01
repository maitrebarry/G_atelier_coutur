import React, {useEffect, useMemo, useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, View, ToastAndroid} from 'react-native';
import AppButton from '../components/AppButton';
import FormInput from '../components/FormInput';
import {getClientDetails} from '../services/clientService';
import {createRendezvous, listClientsForRendezvous, updateRendezvous} from '../services/rendezvousService';
import {query} from '../database/db';

const TYPES = ['LIVRAISON', 'RETOUCHE', 'MESURE', 'ESSAYAGE', 'AUTRE'];

function localDateValue() {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export default function RendezvousFormScreen({route, navigation}) {
  const initialClient = route.params?.idClient ? String(route.params.idClient) : '';
  const {idRendezvous} = route.params || {};
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(initialClient);
  const [clientDetails, setClientDetails] = useState(null);
  const [selectedMeasures, setSelectedMeasures] = useState([]);
  const [form, setForm] = useState({date: localDateValue(), heure: '10:00', type_rendezvous: 'LIVRAISON', notes: ''});

  useEffect(() => {
    listClientsForRendezvous().then(setClients);
    if (idRendezvous) {
      query('SELECT * FROM rendezvous WHERE id_rendezvous = ?', [idRendezvous]).then(rows => {
        if (rows[0]) {
          const r = rows[0];
          setClientId(String(r.id_client));
          const dateObj = new Date(r.date_rdv);
          setForm({
            date: Number.isNaN(dateObj.getTime()) ? localDateValue() : dateObj.toISOString().slice(0, 10),
            heure: Number.isNaN(dateObj.getTime()) ? '10:00' : dateObj.toISOString().slice(11, 16),
            type_rendezvous: r.type_rendezvous || 'LIVRAISON',
            notes: r.notes || '',
          });
          if (r.id_mesure) {
            setSelectedMeasures([r.id_mesure]);
          }
        }
      });
    }
  }, [idRendezvous]);

  useEffect(() => {
    if (!clientId) {
      setClientDetails(null);
      setSelectedMeasures([]);
      return;
    }
    getClientDetails(Number(clientId)).then(details => {
      setClientDetails(details);
      setSelectedMeasures([]);
    });
  }, [clientId]);

  const selectedClient = useMemo(() => clients.find(c => String(c.id_client) === String(clientId)), [clients, clientId]);
  const set = (field, value) => setForm(prev => ({...prev, [field]: value}));
  const toggleMeasure = id => setSelectedMeasures(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));

  const save = async () => {
    if (!clientId) {
      Alert.alert('Validation', 'Veuillez choisir un client.');
      return;
    }
    try {
      const date_rdv = `${form.date}T${form.heure}:00`;
      if (idRendezvous) {
        await updateRendezvous(idRendezvous, {
          date_rdv,
          type_rendezvous: form.type_rendezvous,
          notes: form.notes,
        });
        Alert.alert('Succès', 'Rendez-vous modifie avec succès');
      } else {
        const targets = selectedMeasures.length ? selectedMeasures : [null];
        for (const id_mesure of targets) {
          await createRendezvous({
            id_client: Number(clientId),
            id_mesure,
            date_rdv,
            type_rendezvous: form.type_rendezvous,
            notes: form.notes,
          });
        }
        Alert.alert('Succès', 'Rendez-vous créé avec succès');
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erreur', error?.message || 'Action impossible');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nouveau rendez-vous</Text>
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
      {selectedClient ? <Text style={styles.help}>Client selectionne: {selectedClient.prenom} {selectedClient.nom}</Text> : null}
      {clientDetails?.mesures?.length ? (
        <>
          <Text style={styles.label}>Vetements / mesures</Text>
          <View style={styles.wrap}>
            {clientDetails.mesures.map(m => {
              const active = selectedMeasures.includes(m.id_mesure);
              return (
                <Pressable key={m.id_mesure} onPress={() => toggleMeasure(m.id_mesure)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.type_vetement || 'Mesure'} #{m.id_mesure}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
      <FormInput label="Date (YYYY-MM-DD)" value={form.date} onChangeText={v => set('date', v)} />
      <FormInput label="Heure (HH:mm)" value={form.heure} onChangeText={v => set('heure', v)} />
      <Text style={styles.label}>Motif</Text>
      <View style={styles.wrap}>
        {TYPES.map(type => (
          <Pressable key={type} onPress={() => set('type_rendezvous', type)} style={[styles.chip, form.type_rendezvous === type && styles.chipActive]}>
            <Text style={[styles.chipText, form.type_rendezvous === type && styles.chipTextActive]}>{type}</Text>
          </Pressable>
        ))}
      </View>
      <FormInput label="Notes" value={form.notes} onChangeText={v => set('notes', v)} multiline />
      <AppButton label={idRendezvous ? 'Modifier' : 'Creer'} onPress={save} />
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
  help: {color: '#475569', marginBottom: 12},
});
