import React, {useCallback, useState} from 'react';
import {Alert, FlatList, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppButton from '../components/AppButton';
import {deletePayment, getClientPaymentDetails, getTailleurPaymentDetails} from '../services/paymentService';

export default function PaymentDetailScreen({route, navigation}) {
  const {idClient, idTailleur, type = 'CLIENT'} = route.params;
  const [details, setDetails] = useState(null);

  const load = useCallback(() => {
    const request = type === 'TAILLEUR' ? getTailleurPaymentDetails(idTailleur) : getClientPaymentDetails(idClient);
    request.then(setDetails);
  }, [idClient, idTailleur, type]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmDelete = paiement => {
    Alert.alert('Suppression', `Supprimer le paiement ${paiement.reference} ?`, [
      {text: 'Annuler', style: 'cancel'},
      {text: 'Supprimer', style: 'destructive', onPress: async () => { await deletePayment(paiement.id_paiement); load(); }},
    ]);
  };

  if (!details) return <View style={styles.container}><Text>Chargement...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{details.prenom} {details.nom}</Text>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>Statut: {details.statut_paiement}</Text>
        <Text style={styles.summaryText}>Type: {type === 'TAILLEUR' ? 'Paiement tailleur' : 'Paiement client'}</Text>
        <Text style={styles.summaryText}>Total: {(type === 'TAILLEUR' ? details.total_du : details.prix_total).toLocaleString('fr-FR')} FCFA</Text>
        <Text style={styles.summaryText}>Paye: {details.montant_paye.toLocaleString('fr-FR')} FCFA</Text>
        <Text style={styles.summaryText}>Reste: {details.reste_a_payer.toLocaleString('fr-FR')} FCFA</Text>
      </View>
      <AppButton label={type === 'TAILLEUR' ? 'Nouveau paiement tailleur' : 'Nouveau paiement client'} onPress={() => navigation.navigate('PaymentForm', {type, idClient, idTailleur})} />
      <Text style={styles.section}>Historique</Text>
      <FlatList
        data={details.paiements}
        keyExtractor={item => String(item.id_paiement)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Aucun paiement enregistre.</Text>}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.name}>{Number(item.montant).toLocaleString('fr-FR')} FCFA</Text>
            <Text style={styles.meta}>{item.moyen} - {item.reference}</Text>
            <Text style={styles.meta}>{new Date(item.date_paiement).toLocaleString('fr-FR')}</Text>
            <AppButton label="Recu thermique" onPress={() => navigation.navigate('Receipt', {receiptType: 'PAIEMENT', idPaiement: item.id_paiement})} variant="ghost" />
            <AppButton label="Supprimer" onPress={() => confirmDelete(item)} variant="danger" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: '#f8fafc', gap: 10},
  title: {fontSize: 24, fontWeight: '900', color: '#0f172a'},
  summary: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 14, gap: 5},
  summaryText: {color: '#334155', fontWeight: '800'},
  section: {fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 8},
  list: {gap: 10, paddingBottom: 18},
  card: {padding: 14, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', gap: 7},
  name: {fontSize: 17, color: '#0f766e', fontWeight: '900'},
  meta: {color: '#475569'},
  empty: {textAlign: 'center', color: '#64748b', marginTop: 30},
});
