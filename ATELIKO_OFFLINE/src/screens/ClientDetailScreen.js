import React, {useCallback, useMemo, useState} from 'react';
import {Image, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppButton from '../components/AppButton';
import {AppHeader, BottomBar, StatusChip, ui} from '../components/MobileShell';
import {getClientDetails} from '../services/clientService';

const statusMeta = {
  EN_ATTENTE: {label: 'En attente', color: '#f59f00', bg: '#fff7e6'},
  EN_COURS: {label: 'En cours', color: '#0d6efd', bg: '#e8f1ff'},
  TERMINE: {label: 'Terminé', color: '#198754', bg: '#eafaf1'},
  LIVRE: {label: 'Livré', color: '#6c757d', bg: '#f2f4f7'},
};

const measureLabels = [
  ['E', 'Épaule', 'epaule'],
  ['M', 'Manche', 'manche'],
  ['P', 'Poitrine', 'poitrine'],
  ['T', 'Taille', 'taille'],
  ['L', 'Longueur', 'longueur'],
  ['F', 'Fesse', 'fesse'],
  ['Tm', 'Tour manche', 'tour_manche'],
  ['Lp', 'Long. poitrine', 'longueur_poitrine'],
  ['Lt', 'Long. taille', 'longueur_taille'],
  ['Lf', 'Long. fesse', 'longueur_fesse'],
  ['LJ', 'Long. jupe', 'longueur_jupe'],
  ['C', 'Ceinture', 'ceinture'],
  ['LP', 'Long. pantalon', 'longueur_pantalon'],
  ['Q', 'Cuisse', 'cuisse'],
  ['Cd', 'Cou / corps', 'corps'],
];

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
}

function findMeasureForModel(client, model) {
  return (client.mesures || []).find(m => m.id_mesure === model.id_mesure) || null;
}

function MeasureGrid({measure}) {
  const rows = measureLabels.filter(([, , key]) => measure?.[key] !== null && measure?.[key] !== undefined && measure?.[key] !== '');
  if (rows.length === 0) {
    return <Text style={styles.emptyLine}>Aucune mesure détaillée.</Text>;
  }
  return (
    <View style={styles.measureGrid}>
      {rows.map(([short, label, key]) => (
        <View key={key} style={styles.measurePill}>
          <Text style={styles.measureShort}>{short}</Text>
          <Text style={styles.measureValue}>{measure[key]}</Text>
          <Text style={styles.measureLabel} numberOfLines={1}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ClientDetailScreen({route, navigation}) {
  const {idClient} = route.params;
  const [client, setClient] = useState(null);

  useFocusEffect(useCallback(() => {
    getClientDetails(idClient).then(setClient);
  }, [idClient]));

  const totals = useMemo(() => {
    const modeles = client?.modeles || [];
    return modeles.reduce((acc, m) => {
      acc.prix += Number(m.prix || 0);
      acc.avance += Number(m.avance || 0);
      return acc;
    }, {prix: 0, avance: 0});
  }, [client]);

  if (!client) {
    return (
      <View style={ui.page}>
        <AppHeader navigation={navigation} title="Détail client" subtitle="Chargement..." showBack />
        <View style={styles.center}><Text style={ui.empty}>Client introuvable.</Text></View>
      </View>
    );
  }

  const fullName = `${client.prenom || ''} ${client.nom || ''}`.trim() || 'Client';
  const reste = Math.max(totals.prix - totals.avance, 0);

  return (
    <View style={ui.page}>
      <AppHeader navigation={navigation} title="Détail client" subtitle={fullName} showBack />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{fullName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.title}>{fullName}</Text>
            <Text style={styles.meta}>{client.contact || 'Contact non renseigné'}</Text>
            <Text style={styles.meta}>{client.adresse || 'Adresse non renseignée'}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Modèles</Text>
            <Text style={styles.statValue}>{client.modeles?.length || 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{money(totals.prix)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Reste</Text>
            <Text style={[styles.statValue, styles.restValue]}>{money(reste)}</Text>
          </View>
        </View>

        <View style={styles.actionPanel}>
          <AppButton label="✏️ Modifier" onPress={() => navigation.navigate('ClientForm', {idClient})} variant="warning" />
          <AppButton label="+ Modèle" onPress={() => navigation.navigate('ModeleForm', {idClient})} variant="primary" />
          <AppButton label="💳 Paiement" onPress={() => navigation.navigate('PaymentDetail', {idClient})} variant="success" />
          <AppButton label="📅 RDV" onPress={() => navigation.navigate('RendezvousForm', {idClient})} variant="info" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={ui.sectionTitle}>Habits à coudre</Text>
          <Text style={styles.sectionCount}>{client.modeles?.length || 0}</Text>
        </View>

        {(client.modeles || []).length === 0 ? (
          <Text style={ui.empty}>Aucun modèle enregistré pour ce client.</Text>
        ) : (client.modeles || []).map((model, index) => {
          const measure = findMeasureForModel(client, model);
          const s = statusMeta[model.statut] || {label: model.statut || '—', color: '#6c757d', bg: '#f2f4f7'};
          return (
            <View style={styles.modelCard} key={model.id_modele || index}>
              {model.photo || measure?.habit_photo ? (
                <Image source={{uri: model.photo || measure.habit_photo}} style={styles.modelPhoto} />
              ) : (
                <View style={styles.modelPhotoPlaceholder}>
                  <Text style={styles.placeholderIcon}>🖼️</Text>
                </View>
              )}
              <View style={styles.modelBody}>
                <View style={styles.modelTop}>
                  <View style={{flex: 1}}>
                    <Text style={styles.modelName}>{model.nom_modele || `Modèle ${index + 1}`}</Text>
                    <Text style={styles.meta}>{model.categorie || measure?.type_vetement || 'Catégorie non renseignée'}</Text>
                  </View>
                  <StatusChip label={s.label} color={s.color} backgroundColor={s.bg} />
                </View>
                <Text style={styles.moneyLine}>Prix {money(model.prix)} • Avance {money(model.avance)}</Text>
                {model.description || measure?.description ? (
                  <Text style={styles.description}>{model.description || measure.description}</Text>
                ) : null}
                {measure?.habit_photo ? (
                  <View style={styles.habitPhotoLine}>
                    <Text style={styles.habitPhotoText}>Photo de l'habit enregistrée</Text>
                  </View>
                ) : null}
                <MeasureGrid measure={measure} />
                <View style={styles.cardActions}>
                  <AppButton label="Modifier" onPress={() => navigation.navigate('ClientForm', {idClient})} variant="soft" />
                  {client.mouvements?.[0]?.reference ? (
                    <AppButton label="Reçu" onPress={() => navigation.navigate('Receipt', {receiptType: 'MOUVEMENT', movementReference: client.mouvements[0].reference})} variant="ghost" />
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}

        <View style={styles.sectionHeader}>
          <Text style={ui.sectionTitle}>Entrées / sorties</Text>
          <Text style={styles.sectionCount}>{client.mouvements?.length || 0}</Text>
        </View>
        {(client.mouvements || []).slice(0, 8).map(m => (
          <View style={styles.timelineCard} key={m.id_mouvement}>
            <View style={[styles.timelineDot, m.type_mouvement === 'SORTIE' && styles.timelineDotOut]} />
            <View style={{flex: 1}}>
              <Text style={styles.timelineTitle}>{m.type_mouvement} • {m.reference}</Text>
              <Text style={styles.meta}>{new Date(m.date_mouvement).toLocaleString('fr-FR')}</Text>
              {m.notes ? <Text style={styles.meta}>{m.notes}</Text> : null}
            </View>
          </View>
        ))}
      </ScrollView>
      <BottomBar navigation={navigation} active="Clients" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: 14, paddingBottom: 94, backgroundColor: '#f6f8fb'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  profileCard: {backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5eaf3', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12},
  avatar: {width: 56, height: 56, borderRadius: 18, backgroundColor: '#e8f1ff', alignItems: 'center', justifyContent: 'center'},
  avatarText: {fontSize: 24, color: '#0d6efd', fontWeight: '900'},
  title: {fontSize: 21, fontWeight: '900', color: '#1b2a4a'},
  meta: {color: '#64748b', lineHeight: 20, fontSize: 12},
  statsRow: {flexDirection: 'row', gap: 8, marginTop: 10},
  statBox: {flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5eaf3', padding: 10},
  statLabel: {fontSize: 11, color: '#64748b', fontWeight: '800'},
  statValue: {fontSize: 14, color: '#0d6efd', fontWeight: '900', marginTop: 4},
  restValue: {color: '#dc3545'},
  actionPanel: {backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5eaf3', padding: 10, marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  sectionHeader: {marginTop: 18, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sectionCount: {minWidth: 30, textAlign: 'center', backgroundColor: '#e8f1ff', color: '#0d6efd', fontWeight: '900', paddingVertical: 4, borderRadius: 8},
  modelCard: {backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5eaf3', overflow: 'hidden', marginBottom: 12},
  modelPhoto: {width: '100%', height: 205, backgroundColor: '#eef2f7'},
  modelPhotoPlaceholder: {height: 132, backgroundColor: '#f3f6fb', alignItems: 'center', justifyContent: 'center'},
  placeholderIcon: {fontSize: 34},
  modelBody: {padding: 12, gap: 8},
  modelTop: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8},
  modelName: {fontSize: 17, fontWeight: '900', color: '#1b2a4a'},
  moneyLine: {fontWeight: '900', color: '#198754'},
  description: {color: '#1f2937', backgroundColor: '#f8f9fc', padding: 8, borderRadius: 8},
  habitPhotoLine: {alignSelf: 'flex-start', backgroundColor: '#eafaf1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5},
  habitPhotoText: {fontSize: 12, color: '#198754', fontWeight: '900'},
  measureGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  measurePill: {width: '31.5%', minHeight: 68, backgroundColor: '#f8f9fc', borderRadius: 8, borderWidth: 1, borderColor: '#edf1f6', padding: 8},
  measureShort: {fontSize: 12, color: '#0d6efd', fontWeight: '900'},
  measureValue: {fontSize: 18, color: '#1b2a4a', fontWeight: '900', marginTop: 2},
  measureLabel: {fontSize: 10, color: '#64748b', marginTop: 2},
  emptyLine: {color: '#94a3b8', fontStyle: 'italic'},
  cardActions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2},
  timelineCard: {backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5eaf3', padding: 12, marginBottom: 8, flexDirection: 'row', gap: 10},
  timelineDot: {width: 12, height: 12, borderRadius: 6, backgroundColor: '#198754', marginTop: 4},
  timelineDotOut: {backgroundColor: '#f59f00'},
  timelineTitle: {fontWeight: '900', color: '#1b2a4a'},
});
