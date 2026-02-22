import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import api from '../api/backend';

export default function RendezvousCreateScreen({ route, navigation }) {
  const client = route.params?.client;
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState(client?.email || '');

  const handleCreate = async () => {
    try {
      const payload = {
        clientId: client?.id,
        date,
        note,
        clientEmail: email,
      };
      await api.post('/rendezvous', payload);
      Alert.alert('Succès', 'Rendez-vous créé');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de créer le rendez-vous');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nouveau rendez-vous</Text>
      <Text>Client: {client?.nom || client?.fullName || '—'}</Text>
      <TextInput placeholder="Date (YYYY-MM-DD)" style={styles.input} value={date} onChangeText={setDate} />
      <TextInput placeholder="Email (optionnel)" style={styles.input} value={email} onChangeText={setEmail} />
      <TextInput placeholder="Note" style={[styles.input, {height:80}]} multiline value={note} onChangeText={setNote} />
      <Button title="Créer" onPress={handleCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6, marginBottom: 12 },
});
