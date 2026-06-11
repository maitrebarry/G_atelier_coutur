import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [synthesis, setSynthesis] = useState(null);

  const statusMeta = useMemo(() => ({
    EN_ATTENTE: {label: 'En attente', color: '#dc3545', bg: '#fdecee'},
    PARTIEL: {label: 'Partiel', color: '#f59f00', bg: '#fff7e6'},
    PAYE: {label: 'Payé', color: '#198754', bg: '#eafaf1'},
  }), []);

  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  const goToPreviousMonth = useCallback(() => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }, [month, year]);

  const goToNextMonth = useCallback(() => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }, [month, year]);

  const load = useCallback(() => {
    const loader = activeTab === 'CLIENT' ? listClientPaymentSummaries : listTailleurPaymentSummaries;
    loader(search, status).then(setItems);
    getMonthlyPaymentSynthesis(month, year, status).then(setSynthesis);
  }, [activeTab, search, status, month, year]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

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

        <View style={styles.monthBar}>
          <Pressable style={styles.monthButton} onPress={goToPreviousMonth}>
            <Text style={styles.monthButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{monthNames[month - 1]} {year}</Text>
          <Pressable style={styles.monthButton} onPress={goToNextMonth}>
            <Text style={styles.monthButtonText}>›</Text>
          </Pressable>
        </View>

        {synthesis ? (
          <View style={styles.synthesis}>
            <View style={styles.metric}><Text style={styles.metricLabel}>Encaissements</Text><Text style={styles.metricValue}>{money(synthesis.total_recouvrement)}</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>Entrées</Text><Text style={styles.metricValue}>{synthesis.nombre_entrees ?? 0}</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>Sorties</Text><Text style={styles.metricValue}>{synthesis.nombre_sorties}</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>Total modèles</Text><Text style={styles.metricValue}>{money(synthesis.total_modeles)}</Text></View>
          </View>
        ) : null}
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
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.name}>{item.prenom} {item.nom}</Text>
                  <Text style={styles.meta}>{item.contact || '-'}</Text>
                </View>
                <StatusChip label={meta.label} color={meta.color} backgroundColor={meta.bg} />
              </View>
              <Text style={styles.meta}>{activeTab === 'CLIENT' ? `Modèles: ${item.nombre_modeles}` : `Travaux affectés terminés: ${item.modeles_cousus}`}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, {width: `${percent}%`}]} />
              </View>
              <View style={styles.overviewRow}>
                <Text style={styles.money}>Payé {money(item.montant_paye)} / {money(total)}</Text>
                <Text style={styles.remaining}>Reste {money(item.reste_a_payer)}</Text>
              </View>
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
  contentTop: {paddingHorizontal: 18, paddingTop: 12},
  tabs: {flexDirection: 'row', gap: 10, marginBottom: 12, backgroundColor: '#eef4ff', padding: 5, borderRadius: 18},
  tab: {flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f8fbff'},
  tabActive: {backgroundColor: '#0d6efd'},
  tabText: {fontWeight: '800', color: '#475569'},
  tabTextActive: {color: '#ffffff'},
  synthesis: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12},
  metric: {width: '48%', backgroundColor: '#ffffff', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: '#e8edf5', shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: {width: 0, height: 4}, elevation: 2},
  metricLabel: {fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4},
  metricValue: {fontSize: 15, color: '#102a43', fontWeight: '900', marginTop: 4},
  monthBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12, backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 10, shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: {width: 0, height: 4}, elevation: 2},
  monthButton: {width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc'},
  monthButtonText: {fontSize: 18, color: '#334155', fontWeight: '900'},
  monthLabel: {fontSize: 14, color: '#334155', fontWeight: '800'},
  filters: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 14},
  chip: {borderWidth: 1, borderColor: '#d1d5db', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#ffffff'},
  chipActive: {backgroundColor: '#0d6efd', borderColor: '#0d6efd'},
  chipText: {fontWeight: '800', color: '#475569', fontSize: 12},
  chipTextActive: {color: '#ffffff'},
  list: {paddingHorizontal: 18},
  card: {padding: 18, borderRadius: 22, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#eef2f8', shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: {width: 0, height: 10}, elevation: 4, gap: 12},
  cardHeader: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12},
  cardHeaderLeft: {flex: 1},
  name: {fontSize: 18, color: '#102a43', fontWeight: '900'},
  meta: {color: '#64748b', fontSize: 13, marginTop: 4},
  money: {fontWeight: '900', color: '#0f766e', fontSize: 14},
  remaining: {fontWeight: '900', color: '#b91c1c', fontSize: 14},
  progressTrack: {height: 8, backgroundColor: '#eef4fb', borderRadius: 999, overflow: 'hidden', marginTop: 12},
  progressFill: {height: '100%', backgroundColor: '#0d6efd'},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16},
  overviewRow: {flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10, flexWrap: 'wrap'},
});
