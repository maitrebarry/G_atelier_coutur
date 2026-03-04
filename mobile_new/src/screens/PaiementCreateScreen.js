import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import api from '../api/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PaiementCreateScreen({ route, navigation }) {
  const { entity, type } = route.params || {};
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('ESPECES');
  const [reference, setReference] = useState('');

  const handlePay = async () => {
    const isClient = type !== 'tailleurs';
    const maxAmount = Number(entity?.reste || entity?.resteAPayer || 0);
    const targetId = entity?.id || entity?.clientId || entity?.tailleurId;
    if (!targetId) return Alert.alert('Erreur', 'Entité de paiement introuvable');
    if (!amount || parseFloat(amount) <= 0) return Alert.alert('Erreur', 'Montant invalide');
    if (parseFloat(amount) > maxAmount) return Alert.alert('Erreur', 'Montant supérieur au reste à payer');

    try {
      const userData = JSON.parse(await AsyncStorage.getItem('userData')) || {};
      const atelierId = userData.atelierId || userData.atelier?.id;
      if (!atelierId) return Alert.alert('Erreur', 'Atelier introuvable');

      const payload = {
        montant: parseFloat(amount),
        moyen: method,
        reference: reference || `REF-${isClient ? 'CLI' : 'TAI'}-${Date.now().toString().slice(-6)}`,
        atelierId,
        ...(isClient ? { clientId: targetId } : { tailleurId: targetId }),
      };

      await api.post(isClient ? '/paiements/clients' : '/paiements/tailleurs', payload);
      Alert.alert('Succès', 'Paiement enregistré');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || e?.response?.data || 'Echec de l\'enregistrement');
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nouveau paiement</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
      <Text style={styles.labelTitle}>{type === 'tailleurs' ? 'Tailleur' : 'Client'}:</Text>
      <Text style={styles.label}>{entity?.prenom || ''} {entity?.nom || ''}</Text>
      <Text style={styles.subLabel}>Reste à payer: {Number(entity?.reste || entity?.resteAPayer || 0).toLocaleString('fr-FR')} FCFA</Text>

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

      <Text style={[styles.labelTitle, { marginBottom: 8 }]}>Moyen de paiement</Text>
      <View style={styles.methodRow}>
        {['ESPECES', 'MOBILE_MONEY'].map((m) => (
          <TouchableOpacity key={m} style={[styles.methodChip, method === m && styles.methodChipActive]} onPress={() => setMethod(m)}>
            <Text style={[styles.methodChipText, method === m && styles.methodChipTextActive]}>{m === 'ESPECES' ? 'Espèces' : 'Mobile Money'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handlePay}>
        <Text style={styles.saveBtnText}>Enregistrer le paiement</Text>
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
  },
  labelTitle: { fontSize: 13, color: '#556483', fontWeight: '800' },
  label: { fontSize: 18, marginTop: 2, marginBottom: 8, fontWeight: '900', color: '#1d2c4d' },
  subLabel: { fontSize: 13, color: '#dc3545', marginBottom: 14, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#dfe5f1',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  methodChip: {
    borderWidth: 1,
    borderColor: '#dbe2ef',
    borderRadius: 999,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  methodChipActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  methodChipText: { color: '#2b3c62', fontWeight: '700' },
  methodChipTextActive: { color: '#fff' },
  saveBtn: {
    marginTop: 4,
    backgroundColor: '#0d6efd',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '900' },
});
