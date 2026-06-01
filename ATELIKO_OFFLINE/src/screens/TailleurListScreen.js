import React, {useCallback, useState} from 'react';
import {Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, View, ToastAndroid} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppButton from '../components/AppButton';
import FormInput from '../components/FormInput';
import {AppHeader, BottomBar, ui} from '../components/MobileShell';
import {createTailleur, listTailleurs} from '../services/tailleurService';

export default function TailleurListScreen({navigation}) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({nom: '', prenom: '', contact: '', email: ''});

  const load = useCallback(() => {
    listTailleurs(search).then(setItems);
  }, [search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (field, value) => setForm(prev => ({...prev, [field]: value}));
  const save = async () => {
    if (!form.nom.trim() || !form.prenom.trim()) {
      Alert.alert('Validation', 'Nom et prénom du tailleur sont obligatoires.');
      return;
    }
    try {
      await createTailleur(form);
      Alert.alert('Succès', 'Tailleur enregistré avec succès');
      setForm({nom: '', prenom: '', contact: '', email: ''});
      load();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer le tailleur.');
    }
  };

  return (
    <View style={ui.page}>
      <AppHeader navigation={navigation} title="Tailleurs" subtitle="Equipe et affectations" showBack />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.section}>Nouveau tailleur</Text>
          <FormInput label="Nom" value={form.nom} onChangeText={v => set('nom', v)} />
          <FormInput label="Prénom" value={form.prenom} onChangeText={v => set('prenom', v)} />
          <FormInput label="Contact" value={form.contact} onChangeText={v => set('contact', v)} />
          <FormInput label="Email" value={form.email} onChangeText={v => set('email', v)} />
          <AppButton label="Enregistrer tailleur" onPress={save} />
        </View>
        <TextInput style={ui.search} value={search} onChangeText={setSearch} onSubmitEditing={load} placeholder="Rechercher tailleur" placeholderTextColor="#94a3b8" />
        <FlatList
          scrollEnabled={false}
          data={items}
          keyExtractor={item => String(item.id_tailleur)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={ui.empty}>Aucun tailleur.</Text>}
          renderItem={({item}) => (
            <View style={styles.tailleurCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{String(item.prenom || item.nom || 'T').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.name}>{item.prenom} {item.nom}</Text>
                <Text style={styles.meta}>{item.contact || item.email || 'Contact non renseigné'}</Text>
                <View style={styles.row}>
                  <AppButton label="Affecter travail" onPress={() => navigation.navigate('AffectationForm', {idTailleur: item.id_tailleur})} variant="muted" />
                  <AppButton label="Paiements" onPress={() => navigation.navigate('PaymentDetail', {type: 'TAILLEUR', idTailleur: item.id_tailleur})} variant="ghost" />
                </View>
              </View>
            </View>
          )}
        />
      </ScrollView>
      <BottomBar navigation={navigation} active="Tailleurs" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: 12, paddingBottom: 92, gap: 12},
  section: {fontSize: 18, fontWeight: '900', color: '#1d2c4d', marginBottom: 8},
  list: {gap: 10},
  card: {padding: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5eaf3', gap: 7},
  tailleurCard: {padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5eaf3', flexDirection: 'row', gap: 12},
  avatar: {width: 44, height: 44, borderRadius: 14, backgroundColor: '#f1f4fa', alignItems: 'center', justifyContent: 'center'},
  avatarText: {fontWeight: '900', color: '#0d6efd', fontSize: 18},
  name: {fontSize: 17, color: '#1d2c4d', fontWeight: '900'},
  meta: {color: '#666', fontSize: 12, marginTop: 3},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10},
});
