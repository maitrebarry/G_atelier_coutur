import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import api from '../api/backend';

export default function ClientListScreen({ navigation }) {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/clients');
        setClients(res.data || []);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clients</Text>
      <FlatList
        data={clients}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('RendezvousCreate', { client: item })}>
            <Text style={styles.name}>{item.nom || item.fullName || item.name}</Text>
            <Text style={styles.small}>{item.email || item.telephone || '—'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>Aucun client</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, marginBottom: 8 },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 15 },
  small: { color: '#666' },
});
