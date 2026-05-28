import React, {useEffect, useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import AppButton from '../components/AppButton';
import FormInput from '../components/FormInput';
import {buildPaymentReference, createClientPayment, createTailleurPayment, getClientPaymentDetails, getTailleurPaymentDetails} from '../services/paymentService';

export default function PaymentFormScreen({route, navigation}) {
  const {idClient, idTailleur, type = 'CLIENT'} = route.params;
  const [details, setDetails] = useState(null);
  const [form, setForm] = useState({montant: '', moyen: 'ESPECES', reference: buildPaymentReference(type), note: ''});

  useEffect(() => {
    const request = type === 'TAILLEUR' ? getTailleurPaymentDetails(idTailleur) : getClientPaymentDetails(idClient);
    request.then(setDetails);
  }, [idClient, idTailleur, type]);

  const set = (field, value) => setForm(prev => ({...prev, [field]: value}));
  const save = async () => {
    try {
      let idPaiement;
      if (type === 'TAILLEUR') {
        idPaiement = await createTailleurPayment({...form, id_tailleur: idTailleur});
      } else {
        idPaiement = await createClientPayment({...form, id_client: idClient});
      }
      navigation.replace('Receipt', {receiptType: 'PAIEMENT', idPaiement, autoWhatsApp: type === 'CLIENT'});
    } catch (error) {
      Alert.alert('Erreur', error?.message || 'Paiement impossible');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{type === 'TAILLEUR' ? 'Paiement tailleur' : 'Paiement client'}</Text>
      {details ? (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>{details.prenom} {details.nom}</Text>
          <Text style={styles.remaining}>Reste: {details.reste_a_payer.toLocaleString('fr-FR')} FCFA</Text>
        </View>
      ) : null}
      <FormInput label="Montant FCFA" value={form.montant} onChangeText={v => set('montant', v)} numeric />
      <FormInput label="Reference" value={form.reference} onChangeText={v => set('reference', v)} />
      <Text style={styles.label}>Moyen de paiement</Text>
      <View style={styles.row}>
        {['ESPECES', 'MOBILE_MONEY'].map(m => (
          <Pressable key={m} onPress={() => set('moyen', m)} style={[styles.chip, form.moyen === m && styles.chipActive]}>
            <Text style={[styles.chipText, form.moyen === m && styles.chipTextActive]}>{m === 'ESPECES' ? 'Especes' : 'Mobile Money'}</Text>
          </Pressable>
        ))}
      </View>
      <FormInput label="Note" value={form.note} onChangeText={v => set('note', v)} multiline />
      <AppButton label={type === 'TAILLEUR' ? 'Enregistrer paiement tailleur' : 'Enregistrer le paiement'} onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, backgroundColor: '#f8fafc', flexGrow: 1},
  title: {fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 12},
  summary: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 14, marginBottom: 12},
  summaryText: {fontWeight: '900', color: '#0f172a'},
  remaining: {fontWeight: '900', color: '#b91c1c', marginTop: 4},
  label: {fontSize: 13, color: '#334155', fontWeight: '800', marginBottom: 8},
  row: {flexDirection: 'row', gap: 10, marginBottom: 12},
  chip: {flex: 1, minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'},
  chipActive: {backgroundColor: '#0f766e', borderColor: '#0f766e'},
  chipText: {fontWeight: '800', color: '#334155'},
  chipTextActive: {color: '#fff'},
});
