import React, {useCallback, useMemo, useState} from 'react';
import {Alert, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ToastAndroid} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppButton from '../components/AppButton';
import {AppHeader, BottomBar, ui} from '../components/MobileShell';
import {deleteAlbum, listAlbums} from '../services/modelService';

const CATEGORIES = [
  {key: '', label: 'Tous'},
  {key: 'ROBE', label: 'Robe'},
  {key: 'JUPE', label: 'Jupe'},
  {key: 'HOMME', label: 'Homme'},
  {key: 'ENFANT', label: 'Enfant'},
  {key: 'AUTRE', label: 'Autre'},
];

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
}

function categoryLabel(value) {
  return CATEGORIES.find(c => c.key === String(value || '').toUpperCase())?.label || value || 'Catégorie inconnue';
}

export default function AlbumListScreen({navigation}) {
  const [albums, setAlbums] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const load = useCallback(() => { listAlbums(search).then(setAlbums); }, [search]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filteredAlbums = useMemo(() => {
    if (!category) return albums;
    return albums.filter(item => String(item.categorie || '').toUpperCase() === category);
  }, [category, albums]);

  const confirmDelete = album => {
    Alert.alert('Suppression', `Supprimer l'album "${album.nom_modele || ''}" ?`, [
      {text: 'Annuler', style: 'cancel'},
      {text: 'Supprimer', style: 'destructive', onPress: async () => { 
        await deleteAlbum(album.id_album); 
        Alert.alert('Succès', 'Album supprimé avec succès');
        load(); 
      }},
    ]);
  };

  const renderCard = ({item}) => {
    const price = Number(item.prix || 0);
    return (
      <View style={styles.card}>
        <View style={styles.mediaWrap}>
          {item.photo ? (
            <Image source={{uri: item.photo}} style={styles.media} resizeMode="cover" />
          ) : (
            <View style={styles.mediaPlaceholder}>
              <Text style={styles.mediaPlaceholderText}>🖼️</Text>
            </View>
          )}
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{categoryLabel(item.categorie)}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.modelName}>{item.nom_modele || 'Sans nom'}</Text>
          <Text style={styles.modelDesc}>{item.description || 'Aucune description'}</Text>

          <View style={styles.rowBetween}>
            <Text style={styles.price}>{money(price)}</Text>
            <Text style={styles.clientText}>Album local</Text>
          </View>

          <View style={styles.actionsRow}>
            <AppButton label="Modifier" onPress={() => navigation.navigate('AlbumForm', {album: item})} variant="warning" />
            <AppButton label="Supprimer" onPress={() => confirmDelete(item)} variant="danger" />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={ui.page}>
      <AppHeader navigation={navigation} title="Albums" subtitle="Catalogue de modèles" showBack={false} />
      <View style={styles.topPanel}>
        <TextInput
          style={ui.search}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          placeholder="Rechercher un album..."
          placeholderTextColor="#94a3b8"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {CATEGORIES.map(item => {
            const active = category === item.key;
            return (
              <TouchableOpacity key={item.key || 'all'} style={[styles.filterBtn, active && styles.filterBtnActive]} onPress={() => setCategory(item.key)}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AlbumForm')}>
          <Text style={styles.addBtnText}>+ Nouvel album</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredAlbums}
        keyExtractor={item => String(item.id_album)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Aucun album</Text>
            <Text style={styles.emptySub}>Ajoutez un modèle pour alimenter votre catalogue.</Text>
          </View>
        }
        renderItem={renderCard}
      />
      <BottomBar navigation={navigation} active="Albums" />
    </View>
  );
}

const styles = StyleSheet.create({
  topPanel: {paddingHorizontal: 12, paddingTop: 12, gap: 10},
  filterRow: {gap: 8, paddingRight: 12},
  filterBtn: {borderWidth: 1, borderColor: '#d9e2f2', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8},
  filterBtnActive: {backgroundColor: '#0d6efd', borderColor: '#0d6efd'},
  filterText: {fontWeight: '900', color: '#344563', fontSize: 12},
  filterTextActive: {color: '#fff'},
  addBtn: {height: 44, borderRadius: 10, backgroundColor: '#0d6efd', alignItems: 'center', justifyContent: 'center'},
  addBtnText: {color: '#fff', fontWeight: '900'},
  list: {padding: 12, paddingBottom: 92, gap: 12},
  card: {backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5eaf3', overflow: 'hidden'},
  mediaWrap: {position: 'relative', backgroundColor: '#f3f6fb'},
  media: {width: '100%', height: 210, backgroundColor: '#eef2f7'},
  mediaPlaceholder: {height: 165, alignItems: 'center', justifyContent: 'center'},
  mediaPlaceholderText: {fontSize: 36},
  catBadge: {position: 'absolute', left: 10, top: 10, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#e5eaf3'},
  catText: {fontSize: 12, color: '#0d6efd', fontWeight: '900'},
  cardBody: {padding: 13, gap: 7},
  modelName: {fontSize: 18, fontWeight: '900', color: '#1b2a4a'},
  modelDesc: {fontSize: 13, color: '#64748b', lineHeight: 19},
  rowBetween: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  price: {fontWeight: '900', color: '#198754'},
  clientText: {fontSize: 12, color: '#64748b', flexShrink: 1, textAlign: 'right'},
  actionsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4},
  emptyWrap: {alignItems: 'center', padding: 28},
  emptyTitle: {fontSize: 18, color: '#1b2a4a', fontWeight: '900'},
  emptySub: {fontSize: 13, color: '#64748b', marginTop: 4, textAlign: 'center'},
});
