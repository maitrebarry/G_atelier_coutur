import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, Alert } from 'react-native';
import api from '../api/backend';

const DEFAULT_NUMS = {
  ORANGE_MONEY: '+229 90 00 00 00',
  WAVE: '+229 91 11 11 11',
  MOBICASH: '+229 92 22 22 22',
};

export default function AbonnementScreen() {
  const [plans, setPlans] = useState([]);
  const [paymentNumbers, setPaymentNumbers] = useState(DEFAULT_NUMS);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/subscription/plans');
        setPlans(res.data || []);
      } catch (e) {
        // ignore
      }

      try {
        const res = await api.get('/subscription/manualPaymentNumbers');
        if (res.data) setPaymentNumbers(res.data);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const handleChoose = (plan) => {
    Alert.alert('Paiement', `Suivre la procédure de paiement pour: ${plan.name}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Abonnements</Text>
      <View style={styles.info}>
        <Text>Effectuez le paiement via Mobile Money sur :</Text>
        <Text style={styles.bold}>Orange Money: {paymentNumbers.ORANGE_MONEY}</Text>
        <Text style={styles.bold}>WAVE: {paymentNumbers.WAVE}</Text>
        <Text style={styles.bold}>Mobicash: {paymentNumbers.MOBICASH}</Text>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <View style={styles.plan}>
            <Text style={styles.planName}>{item.name}</Text>
            <Text>{item.description}</Text>
            <Text style={styles.price}>{item.price} {item.currency || 'XOF'}</Text>
            <Button title="Choisir" onPress={() => handleChoose(item)} />
          </View>
        )}
        ListEmptyComponent={<Text>Aucun plan disponible</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, marginBottom: 8 },
  info: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 6, marginBottom: 12 },
  bold: { fontWeight: '700', marginTop: 6 },
  plan: { padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 6, marginBottom: 10 },
  planName: { fontSize: 16, fontWeight: '600' },
  price: { marginTop: 6, marginBottom: 8, color: '#333' },
});
