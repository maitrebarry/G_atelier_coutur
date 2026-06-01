import React, {useCallback, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppHeader, BottomBar, ui} from '../components/MobileShell';
import {listClients} from '../services/clientService';
import {listModeles} from '../services/modelService';
import {listRendezvous} from '../services/rendezvousService';
import {listClientPaymentSummaries} from '../services/paymentService';

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} F`;
}

export default function HomeScreen({navigation}) {
  const [stats, setStats] = useState({
    clients: 0,
    modeles: 0,
    reste: 0,
    rdvToday: 0,
    paymentsPending: 0,
  });
  const [recent, setRecent] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        listClients(),
        listModeles(),
        listRendezvous(),
        listClientPaymentSummaries('', 'EN_ATTENTE'),
      ]).then(([clients, modeles, rdvs, pending]) => {
        if (!active) return;
        const today = new Date().toISOString().slice(0, 10);
        const reste = modeles.reduce((sum, m) => sum + Math.max((Number(m.prix) || 0) - (Number(m.avance) || 0), 0), 0);
        const rdvToday = rdvs.filter(r => String(r.date_rdv || '').slice(0, 10) === today).length;
        const activity = [
          ...clients.slice(0, 2).map(c => ({
            iconName: 'people-outline',
            title: `${c.prenom || ''} ${c.nom || ''}`.trim() || 'Client',
            subtitle: c.contact || 'Client local',
          })),
          ...rdvs.slice(0, 2).map(r => ({
            iconName: 'calendar-outline',
            title: `${r.prenom || ''} ${r.nom || ''}`.trim() || 'Rendez-vous',
            subtitle: r.type_rendezvous || r.statut || 'Planifié',
          })),
        ].slice(0, 4);
        setStats({clients: clients.length, modeles: modeles.length, reste, rdvToday, paymentsPending: pending.length});
        setRecent(activity);
      });
      return () => { active = false; };
    }, []),
  );

  const dashboardCards = useMemo(() => [
    {title: 'Total clients', value: stats.clients, icon: 'people-outline', screen: 'Clients'},
    {title: 'Albums / modèles', value: stats.modeles, icon: 'image-outline', screen: 'Albums'},
    {title: "Rendez-vous aujourd'hui", value: stats.rdvToday, icon: 'calendar-outline', screen: 'Rendezvous'},
    {title: 'Paiements en attente', value: stats.paymentsPending, icon: 'card-outline', screen: 'Payments'},
    {title: 'Reste à encaisser', value: money(stats.reste), icon: 'cash-outline', screen: 'Payments'},
  ], [stats]);

  const QuickActionButton = ({title, icon, onPress, tone = 'blue'}) => (
    <TouchableOpacity activeOpacity={0.86} style={styles.quickActionButton} onPress={onPress}>
      <View style={[styles.quickActionIconWrap, styles[`${tone}Tone`]]}>
        <Ionicons name={icon} size={20} color="#1d4ed8" />
      </View>
      <Text style={styles.quickActionLabel}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color="#94a3b8" style={styles.quickActionArrow} />
    </TouchableOpacity>
  );

  const DashboardButton = ({title, value, icon, onPress}) => (
    <TouchableOpacity activeOpacity={0.86} style={styles.dashboardButton} onPress={onPress}>
      <View style={styles.dashboardIconWrap}>
        <Ionicons name={icon} size={22} color="#0d6efd" />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.dashboardTitle}>{title}</Text>
        <Text style={styles.dashboardValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );

  return (
    <View style={ui.page}>
      <AppHeader navigation={navigation} subtitle="Bonjour 👋" />
      <ScrollView contentContainerStyle={ui.content}>
        <View style={ui.section}>
          <Text style={ui.sectionTitle}>Tableau de bord</Text>
          {dashboardCards.map(card => (
            <DashboardButton key={card.title} {...card} onPress={() => navigation.navigate(card.screen)} />
          ))}
        </View>

        <View style={ui.section}>
          <Text style={ui.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton title="Nouveau client" icon="person-add-outline" tone="blue" onPress={() => navigation.navigate('ClientForm')} />
            <QuickActionButton title="Rendez-vous" icon="calendar-outline" tone="indigo" onPress={() => navigation.navigate('RendezvousForm')} />
            <QuickActionButton title="Paiement" icon="card-outline" tone="green" onPress={() => navigation.navigate('Payments')} />
            <QuickActionButton title="Tailleur" icon="cut-outline" tone="amber" onPress={() => navigation.navigate('Tailleurs')} />
          </View>
        </View>

        <View style={ui.section}>
          <Text style={ui.sectionTitle}>Activité récente</Text>
          {recent.length === 0 ? (
            <Text style={ui.empty}>Aucune activité récente</Text>
          ) : recent.map((item, index) => (
            <View key={`${item.title}-${index}`} style={styles.recentCard}>
              <View style={styles.recentIconWrap}>
                <Ionicons name={item.iconName || 'time-outline'} size={18} color="#2563eb" />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.panelMain}>{item.title}</Text>
                <Text style={styles.panelSub}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <BottomBar navigation={navigation} active="Home" />
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardButton: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e7edf7',
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 12},
    elevation: 4,
  },
  dashboardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#eef4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  dashboardTitle: {fontWeight: '900', fontSize: 16, color: '#102a43'},
  dashboardValue: {color: '#334155', marginTop: 6, fontWeight: '700', fontSize: 14},
  chevron: {marginLeft: 12},
  quickActionsGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12},
  quickActionButton: {
    width: '48%',
    minHeight: 100,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7edf7',
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 10},
    elevation: 3,
  },
  quickActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  blueTone: {backgroundColor: '#e8f1ff'},
  indigoTone: {backgroundColor: '#eef2ff'},
  greenTone: {backgroundColor: '#ecfdf5'},
  amberTone: {backgroundColor: '#fff7ed'},
  quickActionLabel: {color: '#0f172a', fontWeight: '800', fontSize: 14, paddingRight: 10},
  quickActionArrow: {position: 'absolute', right: 14, bottom: 14},
  recentCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eef2f8',
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 8},
    elevation: 2,
  },
  recentIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: '#eef4ff',
  },
  panelMain: {fontSize: 15, fontWeight: '800', color: '#102a43'},
  panelSub: {fontSize: 13, color: '#64748b', marginTop: 4},
});
