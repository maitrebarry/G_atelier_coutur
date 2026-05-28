import React, {useCallback, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
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
            icon: '👥',
            title: `${c.prenom || ''} ${c.nom || ''}`.trim() || 'Client',
            subtitle: c.contact || 'Client local',
          })),
          ...rdvs.slice(0, 2).map(r => ({
            icon: '📅',
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
    {title: 'Total clients', value: stats.clients, icon: '👥', screen: 'Clients'},
    {title: 'Albums / modèles', value: stats.modeles, icon: '🖼️', screen: 'Modeles'},
    {title: "Rendez-vous aujourd'hui", value: stats.rdvToday, icon: '📅', screen: 'Rendezvous'},
    {title: 'Paiements en attente', value: stats.paymentsPending, icon: '💳', screen: 'Payments'},
    {title: 'Reste à encaisser', value: money(stats.reste), icon: '💰', screen: 'Payments'},
  ], [stats]);

  const QuickActionButton = ({title, icon, onPress, tone = 'blue'}) => (
    <TouchableOpacity activeOpacity={0.86} style={styles.quickActionButton} onPress={onPress}>
      <View style={[styles.quickActionIconWrap, styles[`${tone}Tone`]]}>
        <Text style={styles.quickActionIcon}>{icon}</Text>
      </View>
      <Text style={styles.quickActionLabel}>{title}</Text>
      <Text style={styles.quickActionArrow}>›</Text>
    </TouchableOpacity>
  );

  const DashboardButton = ({title, value, icon, onPress}) => (
    <TouchableOpacity activeOpacity={0.86} style={styles.dashboardButton} onPress={onPress}>
      <View style={styles.dashboardIconWrap}>
        <Text style={styles.dashboardIcon}>{icon}</Text>
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.dashboardTitle}>{title}</Text>
        <Text style={styles.dashboardValue}>{value}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={ui.page}>
      <AppHeader navigation={navigation} title="ATELIKO" subtitle="Bonjour 👋" />
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
            <QuickActionButton title="Nouveau client" icon="🧵" tone="blue" onPress={() => navigation.navigate('ClientForm')} />
            <QuickActionButton title="Rendez-vous" icon="📅" tone="indigo" onPress={() => navigation.navigate('RendezvousForm')} />
            <QuickActionButton title="Paiement" icon="💳" tone="green" onPress={() => navigation.navigate('Payments')} />
            <QuickActionButton title="Tailleur" icon="✂️" tone="amber" onPress={() => navigation.navigate('Tailleurs')} />
          </View>
        </View>

        <View style={ui.section}>
          <Text style={ui.sectionTitle}>Activité récente</Text>
          {recent.length === 0 ? (
            <Text style={ui.empty}>Aucune activité récente</Text>
          ) : recent.map((item, index) => (
            <View key={`${item.title}-${index}`} style={styles.recentCard}>
              <View style={styles.recentIconWrap}>
                <Text style={styles.recentIcon}>{item.icon}</Text>
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashboardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dashboardIcon: {fontSize: 20},
  dashboardTitle: {fontWeight: '900', fontSize: 16, color: '#1f2937'},
  dashboardValue: {color: '#666', marginTop: 4, fontWeight: '700'},
  chevron: {fontSize: 18, color: '#aaa'},
  quickActionsGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10},
  quickActionButton: {
    width: '48%',
    minHeight: 82,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5eaf3',
    justifyContent: 'space-between',
  },
  quickActionIconWrap: {width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8},
  blueTone: {backgroundColor: '#e8f1ff'},
  indigoTone: {backgroundColor: '#eef2ff'},
  greenTone: {backgroundColor: '#eafaf1'},
  amberTone: {backgroundColor: '#fff7e6'},
  quickActionIcon: {fontSize: 18},
  quickActionLabel: {color: '#1b2a4a', fontWeight: '900', fontSize: 13, paddingRight: 10},
  quickActionArrow: {position: 'absolute', right: 12, bottom: 9, color: '#94a3b8', fontSize: 18, fontWeight: '900'},
  recentCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edf1f6',
  },
  recentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#f3f6fb',
  },
  recentIcon: {fontSize: 20},
  panelMain: {fontSize: 14, fontWeight: '800', color: '#1f2937'},
  panelSub: {fontSize: 12, color: '#6b7280', marginTop: 2},
});
