import React, {useEffect, useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, View, ToastAndroid} from 'react-native';
import AppButton from '../components/AppButton';
import FormInput from '../components/FormInput';
import {query} from '../database/db';
import {buildPaymentReference, createClientPayment, createTailleurPayment, getClientPaymentDetails, getTailleurPaymentDetails, updateClientPayment} from '../services/paymentService';

export default function PaymentFormScreen({route, navigation}) {
  const {idClient, idTailleur, type = 'CLIENT', paymentId} = route.params;
  const [details, setDetails] = useState(null);
  const [form, setForm] = useState({montant: '', moyen: 'ESPECES', reference: buildPaymentReference(type), id_modele: null, note: ''});

  useEffect(() => {
    const request = type === 'TAILLEUR' ? getTailleurPaymentDetails(idTailleur) : getClientPaymentDetails(idClient);
    request.then(setDetails);

    if (paymentId) {
      query('SELECT * FROM paiement WHERE id_paiement = ?', [paymentId]).then(rows => {
        if (rows[0]) {
          setForm({
            montant: String(rows[0].montant),
            moyen: rows[0].moyen,
            reference: rows[0].reference,
            id_modele: rows[0].id_modele || null,
            note: rows[0].note || '',
          });
        }
      });
    }
  }, [idClient, idTailleur, type, paymentId]);

  const set = (field, value) => setForm(prev => ({...prev, [field]: value}));
  const selectedModel = details?.modeles?.find(m => m.id_modele === form.id_modele);
  const selectedModelPaid = selectedModel ? details.paiements.filter(p => p.id_modele === selectedModel.id_modele).reduce((sum, item) => sum + Number(item.montant || 0), 0) : 0;
  const selectedModelRemaining = selectedModel ? Math.max(Number(selectedModel.prix || 0) - Number(selectedModel.avance || 0) - selectedModelPaid, 0) : 0;

  const save = async () => {
    try {
      let idPaiement = paymentId;
      if (paymentId) {
        if (type === 'CLIENT') {
          await updateClientPayment(paymentId, form);
        } else {
          // Si on gérait la modif tailleur, ce serait ici
        }
      } else {
        if (type === 'TAILLEUR') {
          idPaiement = await createTailleurPayment({...form, id_tailleur: idTailleur});
        } else {
          idPaiement = await createClientPayment({...form, id_client: idClient});
        }
      }
      Alert.alert('Succès', 'Paiement enregistré avec succès', [{ text: 'OK', onPress: () => navigation.replace('Receipt', {receiptType: 'PAIEMENT', idPaiement, autoWhatsApp: type === 'CLIENT'}) }]);
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
          <Text style={styles.remaining}>Reste global: {details.reste_a_payer.toLocaleString('fr-FR')} FCFA</Text>
          {details.modeles?.length ? (
            <Text style={styles.modelHint}>Paiement ciblé par modèle ou montant global.</Text>
          ) : null}
        </View>
      ) : null}
      {details?.modeles?.length ? (
        <View style={styles.modelSelector}>
          <Text style={styles.label}>Payer pour un modèle spécifique</Text>
          <View style={styles.modelChips}>
            <Pressable
              style={[styles.modelChip, !form.id_modele && styles.modelChipActive]}
              onPress={() => set('id_modele', null)}
            >
              <Text style={[styles.modelChipText, !form.id_modele && styles.modelChipTextActive]}>Global</Text>
            </Pressable>
            {details.modeles.map(model => (
              <Pressable
                key={model.id_modele}
                style={[styles.modelChip, form.id_modele === model.id_modele && styles.modelChipActive]}
                onPress={() => set('id_modele', model.id_modele)}
              >
                <Text style={[styles.modelChipText, form.id_modele === model.id_modele && styles.modelChipTextActive]} numberOfLines={1}>
                  {model.nom_modele || `Modèle ${model.id_modele}`}
                </Text>
              </Pressable>
            ))}
          </View>
          {selectedModel ? (
            <Text style={styles.modelRemaining}>Reste pour ce modèle: {selectedModelRemaining.toLocaleString('fr-FR')} FCFA</Text>
          ) : null}
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
      <AppButton label={paymentId ? 'Modifier le paiement' : (type === 'TAILLEUR' ? 'Enregistrer paiement tailleur' : 'Enregistrer le paiement')} onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 10, paddingTop: 6, backgroundColor: '#f8fafc', flexGrow: 1},
  title: {fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 6},
  summary: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, marginBottom: 8},
  summaryText: {fontWeight: '900', color: '#0f172a'},
  remaining: {fontWeight: '900', color: '#b91c1c', marginTop: 4},
  label: {fontSize: 13, color: '#334155', fontWeight: '800', marginBottom: 8},
  modelSelector: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12},
  modelChips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8},
  modelChip: {minWidth: 92, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff'},
  modelChipActive: {backgroundColor: '#0f766e', borderColor: '#0f766e'},
  modelChipText: {fontSize: 12, fontWeight: '900', color: '#334155'},
  modelChipTextActive: {color: '#fff'},
  modelRemaining: {color: '#b91c1c', fontWeight: '800', marginTop: 4},
  modelHint: {color: '#475569', fontSize: 12, marginTop: 4},
  row: {flexDirection: 'row', gap: 10, marginBottom: 12},
  chip: {flex: 1, minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'},
  chipActive: {backgroundColor: '#0f766e', borderColor: '#0f766e'},
  chipText: {fontWeight: '800', color: '#334155'},
  chipTextActive: {color: '#fff'},
});
