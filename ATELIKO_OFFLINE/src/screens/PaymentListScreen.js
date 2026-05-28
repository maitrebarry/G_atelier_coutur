import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppButton from '../components/AppButton';
import {AppHeader, BottomBar, StatusChip, ui} from '../components/MobileShell';
import {getMonthlyPaymentSynthesis, listClientPaymentSummaries, listTailleurPaymentSummaries} from '../services/paymentService';

const STATUS = ['', 'EN_ATTENTE', 'PARTIEL', 'PAYE'];

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} F`;
}

export default function PaymentListScreen({navigation}) {
  const [activeTab, setActiveTab] = useState('CLIENT');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [synthesis, setSynthesis] = useState(null);

  const statusMeta = useMemo(() => ({
    EN_ATTENTE: {label: 'En attente', color: '#dc3545', bg: '#fdecee'},
    PARTIEL: {label: 'Partiel', color: '#f59f00', bg: '#fff7e6'},
    PAYE: {label: 'Payé', color: '#198754', bg: '#eafaf1'},
  }), []);

  const load = useCallback(() => {
    const loader = activeTab === 'CLIENT' ? listClientPaymentSummaries : listTailleurPaymentSummaries;
    loader(search, status).then(setItems);
    getMonthlyPaymentSynthesis(null, null, status).then(setSynthesis);
  }, [activeTab, search, status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={ui.page}>
      <AppHeader navigation={navigation} title="Paiements" subtitle="Clients, reliquats et paiements tailleurs" showBack />
      <View style={styles.contentTop}>
        <View style={styles.tabs}>
          <Pressable onPress={() => setActiveTab('CLIENT')} style={[styles.tab, activeTab === 'CLIENT' && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === 'CLIENT' && styles.tabTextActive]}>Clients</Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab('TAILLEUR')} style={[styles.tab, activeTab === 'TAILLEUR' && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === 'TAILLEUR' && styles.tabTextActive]}>Tailleurs</Text>
          </Pressable>
        </View>

        {synthesis ? (
          <View style={styles.synthesis}>
            <View style={styles.metric}><Text style={styles.metricLabel}>Encaissements</Text><Text style={styles.metricValue}>{money(synthesis.total_recouvrement)}</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>Entrées</Text><Text style={styles.metricValue}>{synthesis.nombre_modeles}</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>Livraisons</Text><Text style={styles.metricValue}>{synthesis.nombre_sorties}</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>Total modèles</Text><Text style={styles.metricValue}>{money(synthesis.total_modeles)}</Text></View>
          </View>
        ) : null}

        <TextInput
          style={ui.search}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          placeholder={`Rechercher ${activeTab === 'CLIENT' ? 'client' : 'tailleur'}`}
          placeholderTextColor="#94a3b8"
        />
        <View style={styles.filters}>
          {STATUS.map(s => (
            <Pressable key={s || 'ALL'} onPress={() => setStatus(s)} style={[styles.chip, status === s && styles.chipActive]}>
              <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s || 'TOUS'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => String(activeTab === 'CLIENT' ? item.id_client : item.id_tailleur)}
        contentContainerStyle={[ui.list, styles.list]}
        ListEmptyComponent={<Text style={ui.empty}>Aucun paiement à suivre.</Text>}
        renderItem={({item}) => {
          const total = activeTab === 'CLIENT' ? item.prix_total : item.total_du;
          const meta = statusMeta[item.statut_paiement] || {label: item.statut_paiement || '—', color: '#6c757d', bg: '#f2f4f7'};
          const percent = Number(total || 0) > 0 ? Math.min(100, Math.round((Number(item.montant_paye || 0) / Number(total || 0)) * 100)) : 0;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{flex: 1}}>
                  <Text style={styles.name}>{item.prenom} {item.nom}</Text>
                  <Text style={styles.meta}>{item.contact || '-'}</Text>
                </View>
                <StatusChip label={meta.label} color={meta.color} backgroundColor={meta.bg} />
              </View>
              <Text style={styles.meta}>{activeTab === 'CLIENT' ? `Modèles: ${item.nombre_modeles}` : `Travaux affectés terminés: ${item.modeles_cousus}`}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, {width: `${percent}%`}]} />
              </View>
              <Text style={styles.money}>Payé {money(item.montant_paye)} / {money(total)}</Text>
              <Text style={styles.remaining}>Reste: {money(item.reste_a_payer)}</Text>
              <View style={styles.row}>
                <AppButton label="Détails" onPress={() => navigation.navigate('PaymentDetail', activeTab === 'CLIENT' ? {type: 'CLIENT', idClient: item.id_client} : {type: 'TAILLEUR', idTailleur: item.id_tailleur})} variant="ghost" />
                <AppButton label={activeTab === 'CLIENT' ? 'Encaisser' : 'Payer tailleur'} onPress={() => navigation.navigate('PaymentForm', activeTab === 'CLIENT' ? {type: 'CLIENT', idClient: item.id_client} : {type: 'TAILLEUR', idTailleur: item.id_tailleur})} />
              </View>
            </View>
          );
        }}
      />
      <BottomBar navigation={navigation} active="Payments" />
    </View>
  );
}

const styles = StyleSheet.create({
  contentTop: {paddingHorizontal: 12, paddingTop: 12},
  tabs: {flexDirection: 'row', gap: 8, marginBottom: 12},
  tab: {flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, alignItems: 'center', backgroundColor: '#fff'},
  tabActive: {backgroundColor: '#0d6efd', borderColor: '#0d6efd'},
  tabText: {fontWeight: '900', color: '#334155'},
  tabTextActive: {color: '#fff'},
  synthesis: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12},
  metric: {width: '48%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10},
  metricLabel: {fontSize: 11, color: '#64748b', fontWeight: '800', textTransform: 'uppercase'},
  metricValue: {fontSize: 16, color: '#0f172a', fontWeight: '900', marginTop: 3},
  filters: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12},
  chip: {borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff'},
  chipActive: {backgroundColor: '#0d6efd', borderColor: '#0d6efd'},
  chipText: {fontWeight: '800', color: '#334155', fontSize: 12},
  chipTextActive: {color: '#fff'},
  list: {paddingHorizontal: 12},
  card: {padding: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5eaf3', gap: 6},
  cardHeader: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8},
  name: {fontSize: 17, color: '#1d2c4d', fontWeight: '900'},
  meta: {color: '#666', fontSize: 12, marginTop: 2},
  money: {fontWeight: '900', color: '#198754', marginTop: 6},
  remaining: {fontWeight: '900', color: '#dc3545'},
  progressTrack: {height: 7, backgroundColor: '#eef2f7', borderRadius: 6, overflow: 'hidden', marginTop: 8},
  progressFill: {height: '100%', backgroundColor: '#20c997'},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8},
});
