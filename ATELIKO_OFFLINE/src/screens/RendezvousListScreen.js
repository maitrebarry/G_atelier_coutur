import React, {useCallback, useMemo, useState} from 'react';
import {Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View, ToastAndroid} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppButton from '../components/AppButton';
import {AppHeader, BottomBar, StatusChip, ui} from '../components/MobileShell';
import {deleteRendezvous, listRendezvous, updateRendezvousStatus} from '../services/rendezvousService';

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || '-';
  return d.toLocaleString('fr-FR');
}

export default function RendezvousListScreen({navigation}) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');

  const statusMeta = useMemo(() => ({
    PLANIFIE: {label: 'Planifié', color: '#0dcaf0', bg: '#e8faff'},
    EN_ATTENTE: {label: 'En attente', color: '#f59f00', bg: '#fff7e6'},
    CONFIRME: {label: 'Confirmé', color: '#198754', bg: '#eafaf1'},
    ANNULE: {label: 'Annulé', color: '#dc3545', bg: '#fdecee'},
    TERMINE: {label: 'Terminé', color: '#6c757d', bg: '#f2f4f7'},
  }), []);

  const load = useCallback(() => {
    listRendezvous(search).then(setItems);
  }, [search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const changeStatus = (item, statut) => {
    const label = statut === 'TERMINE' ? 'prêt à récupérer' : statut;
    Alert.alert('Confirmation', `Passer ce rendez-vous en ${label} ?`, [
      {text: 'Annuler', style: 'cancel'},
      {text: 'Confirmer', onPress: async () => {
        const movement = await updateRendezvousStatus(item.id_rendezvous, statut);
        Alert.alert('Succès', 'Statut mis à jour avec succès');
        load();
        if (statut === 'TERMINE') {
          navigation.navigate('Receipt', {receiptType: 'RDV_READY', idRendezvous: item.id_rendezvous, autoWhatsApp: true});
        } else if (movement?.reference) {
          navigation.navigate('Receipt', {receiptType: 'MOUVEMENT', movementReference: movement.reference});
        }
      }},
    ]);
  };

  const remove = item => {
    Alert.alert('Suppression', 'Supprimer ce rendez-vous ?', [
      {text: 'Annuler', style: 'cancel'},
      {text: 'Supprimer', style: 'destructive', onPress: async () => { 
        await deleteRendezvous(item.id_rendezvous); 
        Alert.alert('Succès', 'Rendez-vous supprimé avec succès');
        load(); 
      }},
    ]);
  };

  return (
    <View style={ui.page}>
      <AppHeader navigation={navigation} title="Rendez-vous" subtitle="Agenda local de l'atelier" showBack />
      <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('RendezvousForm')}>
        <Text style={styles.createBtnText}>+ Nouveau rendez-vous</Text>
      </TouchableOpacity>
      <View style={styles.searchWrap}>
        <TextInput
          style={ui.search}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          placeholder="Rechercher client, motif, note"
          placeholderTextColor="#94a3b8"
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={item => String(item.id_rendezvous)}
        contentContainerStyle={[ui.list, styles.list]}
        ListEmptyComponent={<Text style={ui.empty}>Aucun rendez-vous.</Text>}
        renderItem={({item}) => {
          const s = statusMeta[item.statut] || {label: item.statut || '—', color: '#6c757d', bg: '#f2f4f7'};
          return (
            <View style={styles.item}>
              <View style={styles.itemHeader}>
                <View style={{flex: 1}}>
                  <Text style={styles.clientName}>{item.prenom} {item.nom}</Text>
                  <Text style={styles.small}>{item.contact || 'Contact non renseigné'}</Text>
                </View>
                <StatusChip label={s.label} color={s.color} backgroundColor={s.bg} />
              </View>
              <Text style={styles.small}>{formatDate(item.date_rdv)}</Text>
              <Text style={styles.small}>{item.type_rendezvous || 'RDV'}{item.type_vetement ? ` • ${item.type_vetement}` : ''}</Text>
              {item.notes ? <Text style={styles.note}>{item.notes}</Text> : null}
              <View style={styles.actionsRow}>
                {['PLANIFIE', 'EN_ATTENTE'].includes(item.statut) ? <AppButton label="Confirmer" onPress={() => changeStatus(item, 'CONFIRME')} variant="ghost" /> : null}
                {!['ANNULE', 'TERMINE'].includes(item.statut) ? <AppButton label="Prêt à récupérer" onPress={() => changeStatus(item, 'TERMINE')} variant="muted" /> : null}
                {!['ANNULE', 'TERMINE'].includes(item.statut) ? <AppButton label="Modifier" onPress={() => navigation.navigate('RendezvousForm', {idRendezvous: item.id_rendezvous})} variant="ghost" /> : null}
                {!['ANNULE', 'TERMINE'].includes(item.statut) ? <AppButton label="Annuler" onPress={() => changeStatus(item, 'ANNULE')} variant="danger" /> : null}
                {!['CONFIRME', 'TERMINE'].includes(item.statut) ? <AppButton label="Supprimer" onPress={() => remove(item)} variant="danger" /> : null}
              </View>
            </View>
          );
        }}
      />
      <BottomBar navigation={navigation} active="Rendezvous" />
    </View>
  );
}

const styles = StyleSheet.create({
  createBtn: {marginHorizontal: 12, marginTop: 10, marginBottom: 8, backgroundColor: '#0d6efd', borderRadius: 10, paddingVertical: 13, alignItems: 'center'},
  createBtnText: {color: '#fff', fontWeight: '900'},
  searchWrap: {paddingHorizontal: 12, marginBottom: 12},
  list: {paddingHorizontal: 12},
  item: {padding: 12, borderWidth: 1, borderColor: '#e5eaf3', borderRadius: 12, backgroundColor: '#fff'},
  itemHeader: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8},
  clientName: {fontWeight: '900', color: '#1d2c4d', marginBottom: 4, fontSize: 16},
  small: {color: '#666', fontSize: 12, marginTop: 3},
  note: {color: '#1f2937', marginTop: 8, backgroundColor: '#f8f9fc', padding: 8, borderRadius: 8},
  actionsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10},
});
