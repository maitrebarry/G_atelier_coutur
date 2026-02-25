import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Picker } from 'react-native';
import api from '../api/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PaiementCreateScreen({ route, navigation }) {
  const { client } = route.params || {};
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('ESPECES');
  const [reference, setReference] = useState('');

  const handlePay = async () => {
    if (!amount || parseFloat(amount) <= 0) return Alert.alert('Erreur', 'Montant invalide');
    if (parseFloat(amount) > (client.resteAPayer || 99999999)) return Alert.alert('Erreur', 'Montant supérieur au reste à payer');

    try {
      const userData = JSON.parse(await AsyncStorage.getItem('userData')) || {};
      const atelierId = userData.atelierId || userData.id;

      const payload = {
        montant: parseFloat(amount),
        moyen: method,
        reference: reference || `REF-CLI-${Date.now().toString().slice(-6)}`,
        atelierId,
        clientId: client.clientId || client.id
      };

      await api.post('/paiements/clients', payload);
      Alert.alert('Succès', 'Paiement enregistré');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', 'Echec de l\'enregistrement');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nouveau Paiement</Text>
      <Text style={styles.label}>Client: {client?.nom} {client?.prenom}</Text>
      <Text style={styles.label}>Reste à payer: {client?.resteAPayer || 0} FCFA</Text>

      <TextInput 
        style={styles.input} 
        placeholder="Montant FCFA" 
        keyboardType="numeric" 
        value={amount} 
        onChangeText={setAmount} 
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Référence (optionnel)" 
        value={reference} 
        onChangeText={setReference} 
      />

      {/* Basic manual picker UI or just TextInput for method if simpler */}
      <View style={{marginBottom: 12}}>
        <Text>Moyen: {method}</Text>
        <Button title="Changer (ESPECES/OM/WAVE...)" onPress={() => {
            const next = method === 'ESPECES' ? 'ORANGE_MONEY' : method === 'ORANGE_MONEY' ? 'WAVE' : 'ESPECES';
            setMethod(next);
        }} />
      </View>

      <Button title="Enregistrer le paiement" onPress={handlePay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  label: { fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6, marginBottom: 16 }
});
