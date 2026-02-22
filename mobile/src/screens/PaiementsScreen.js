import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Button, Alert } from 'react-native';
import api from '../api/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PaiementsScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');

  const fetchClients = async () => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('userData')) || {};
      const atelierId = userData.atelierId || userData.id;
      const res = await api.get(`/paiements/clients/recherche?atelierId=${atelierId}&searchTerm=${search}`);
      const data = res.data.data || res.data || [];
      setClients(data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paiements Clients</Text>
      <TextInput 
        style={styles.search} 
        placeholder="Rechercher un client..." 
        value={search} 
        onChangeText={setSearch} 
      />
      <FlatList 
        data={clients}
        keyExtractor={item => String(item.clientId || item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.item} 
            onPress={() => navigation.navigate('PaiementCreate', { client: item })}
          >
            <View>
              <Text style={styles.name}>{item.nom} {item.prenom}</Text>
              <Text style={styles.sub}>Reste à payer: {item.resteAPayer || 0} FCFA</Text>
            </View>
            <Text style={{color: '#0d6efd'}}>Payer</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, marginBottom: 12, fontWeight: 'bold' },
  search: { padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, marginBottom: 12 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 14, color: '#666' }
});
