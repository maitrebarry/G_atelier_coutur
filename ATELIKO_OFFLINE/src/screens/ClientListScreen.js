import React, {useCallback, useState} from 'react';
import {Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppButton from '../components/AppButton';
import {AppHeader, BottomBar, ui} from '../components/MobileShell';
import {deleteClient, listClients} from '../services/clientService';

export default function ClientListScreen({navigation}) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    listClients(search).then(setClients);
  }, [search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmDelete = client => {
    Alert.alert('Suppression', `Supprimer ${client.prenom} ${client.nom} ?`, [
      {text: 'Annuler', style: 'cancel'},
      {text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteClient(client.id_client); load(); }},
    ]);
  };

  return (
    <View style={ui.page}>
      <AppHeader navigation={navigation} title="Clients" subtitle="Carnet local de l'atelier" showBack />
      <View style={styles.topActions}>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('ClientForm')}>
          <Text style={styles.createBtnText}>+ Nouveau client</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          style={ui.search}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          placeholder="Rechercher nom, contact, adresse"
          placeholderTextColor="#94a3b8"
        />
      </View>
      <FlatList
        data={clients}
        keyExtractor={item => String(item.id_client)}
        contentContainerStyle={[ui.list, styles.list]}
        ListEmptyComponent={<Text style={ui.empty}>Aucun client enregistré.</Text>}
        renderItem={({item}) => {
          const total = Number(item.total_prix || 0);
          const paid = Number(item.total_avance || 0);
          const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
          return (
            <TouchableOpacity activeOpacity={0.86} style={styles.card} onPress={() => navigation.navigate('ClientDetail', {idClient: item.id_client})}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{String(item.prenom || item.nom || 'C').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.name}>{item.prenom} {item.nom}</Text>
                <Text style={styles.small}>{item.contact || 'Contact non renseigné'}{item.adresse ? ` • ${item.adresse}` : ''}</Text>
                <Text style={styles.small}>{item.modeles_count || 0} modèle(s)</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, {width: `${percent}%`}]} />
                </View>
                <Text style={styles.money}>Avance {paid.toLocaleString('fr-FR')} / {total.toLocaleString('fr-FR')} FCFA</Text>
                <View style={styles.row}>
                  <AppButton label="Détails" onPress={() => navigation.navigate('ClientDetail', {idClient: item.id_client})} variant="ghost" />
                  <AppButton label="Modifier" onPress={() => navigation.navigate('ClientForm', {idClient: item.id_client})} variant="muted" />
                  <AppButton label="Supprimer" onPress={() => confirmDelete(item)} variant="danger" />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <BottomBar navigation={navigation} active="Clients" />
    </View>
  );
}

const styles = StyleSheet.create({
  topActions: {paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8},
  createBtn: {backgroundColor: '#0d6efd', borderRadius: 10, paddingVertical: 13, alignItems: 'center'},
  createBtnText: {color: '#fff', fontWeight: '900'},
  searchWrap: {paddingHorizontal: 12, marginBottom: 12},
  list: {paddingHorizontal: 12},
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5eaf3',
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {width: 44, height: 44, borderRadius: 14, backgroundColor: '#f1f4fa', alignItems: 'center', justifyContent: 'center'},
  avatarText: {fontWeight: '900', color: '#0d6efd', fontSize: 18},
  name: {fontWeight: '900', color: '#1d2c4d', fontSize: 16, marginBottom: 3},
  small: {color: '#666', fontSize: 12, marginTop: 2},
  money: {fontWeight: '900', color: '#198754', marginTop: 6},
  progressTrack: {height: 7, backgroundColor: '#eef2f7', borderRadius: 6, overflow: 'hidden', marginTop: 8},
  progressFill: {height: '100%', backgroundColor: '#20c997'},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10},
});
