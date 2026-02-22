import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import api from '../api/backend';

export default function RendezvousScreen() {
  const [list, setList] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/rendezvous');
        setList(res.data || []);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rendez-vous</Text>
      <FlatList data={list} keyExtractor={(i) => String(i.id)} renderItem={({ item }) => (
        <View style={styles.item}>
          <Text>{item.clientName || item.client?.nom || '—'}</Text>
          <Text style={styles.small}>{item.date || item.createdAt}</Text>
        </View>
      )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, marginBottom: 8 },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  small: { color: '#666', fontSize: 12 },
});
