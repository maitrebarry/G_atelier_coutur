import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../api/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PaiementCreateScreen({ route, navigation }) {
  const { entity, type } = route.params || {};
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('ESPECES');
  const [reference, setReference] = useState('');
  const [recuData, setRecuData] = useState(null);

  const handlePay = async () => {
    const isClient = type !== 'tailleurs';
    const maxAmount = Number(entity?.reste || entity?.resteAPayer || 0);
    const targetId = entity?.id || entity?.clientId || entity?.tailleurId;
    if (!targetId) return Alert.alert('Erreur', 'Entité de paiement introuvable');
    if (!amount || parseFloat(amount) <= 0) return Alert.alert('Erreur', 'Montant invalide');
    if (parseFloat(amount) > maxAmount) return Alert.alert('Erreur', 'Montant supérieur au reste à payer');

    try {
      const userData = JSON.parse(await AsyncStorage.getItem('userData')) || {};
      const atelierId = userData.atelierId || userData.atelier?.id;
      if (!atelierId) return Alert.alert('Erreur', 'Atelier introuvable');

      const payload = {
        montant: parseFloat(amount),
        moyen: method,
        reference: reference || `REF-${isClient ? 'CLI' : 'TAI'}-${Date.now().toString().slice(-6)}`,
        atelierId,
        ...(isClient ? { clientId: targetId } : { tailleurId: targetId }),
      };

      const res = await api.post(isClient ? '/paiements/clients' : '/paiements/tailleurs', payload);
      const paiementId = res?.data?.id;
      if (paiementId) {
        try {
          const recuRes = await api.get(`/paiements/recu/${isClient ? 'client' : 'tailleur'}/${paiementId}?atelierId=${atelierId}`);
          setRecuData(recuRes?.data || null);
        } catch {
          Alert.alert('Succès', 'Paiement enregistré');
          navigation.goBack();
        }
      } else {
        Alert.alert('Succès', 'Paiement enregistré');
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || e?.response?.data || 'Echec de l\'enregistrement');
    }
  };

  const buildReceiptHtml = (recu) => {
    const name = recu.clientNom
      ? `${recu.clientPrenom || ''} ${recu.clientNom || ''}`.trim()
      : `${recu.tailleurPrenom || ''} ${recu.tailleurNom || ''}`.trim();
    return `
      <html><head><meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #26364f; }
        .header { text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 14px; }
        .row { display: flex; justify-content: space-between; margin: 8px 0; }
        .label { color: #667085; font-weight: bold; }
        .value { font-weight: 700; }
        .amount { margin-top: 16px; padding: 12px; border: 2px dashed #26364f; border-radius: 10px; text-align: center; font-size: 22px; font-weight: bold; }
      </style></head>
      <body>
        <div class="header"><h2>${recu.atelierNom || 'Atelier'}</h2></div>
        <div class="row"><span class="label">Référence</span><span class="value">${recu.reference || ''}</span></div>
        <div class="row"><span class="label">Bénéficiaire</span><span class="value">${name}</span></div>
        <div class="row"><span class="label">Total dû</span><span class="value">${Number(recu.totalDu || 0).toLocaleString('fr-FR')} FCFA</span></div>
        <div class="row"><span class="label">Reste à payer</span><span class="value">${Number(recu.resteAPayer || 0).toLocaleString('fr-FR')} FCFA</span></div>
        <div class="amount">${Number(recu.montant || 0).toLocaleString('fr-FR')} FCFA</div>
      </body></html>
    `;
  };

  const shareReceiptPdf = async () => {
    if (!recuData) return;
    const { uri } = await Print.printToFileAsync({ html: buildReceiptHtml(recuData) });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
    }
  };

  const closeReceipt = () => {
    setRecuData(null);
    navigation.goBack();
  };

  return (
    <View style={styles.page}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nouveau paiement</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
      <Text style={styles.labelTitle}>{type === 'tailleurs' ? 'Tailleur' : 'Client'}:</Text>
      <Text style={styles.label}>{entity?.prenom || ''} {entity?.nom || ''}</Text>
      <Text style={styles.subLabel}>Reste à payer: {Number(entity?.reste || entity?.resteAPayer || 0).toLocaleString('fr-FR')} FCFA</Text>

      <TextInput 
        style={styles.input} 
        placeholder="Montant FCFA" 
        keyboardType="numeric" 
        value={amount} 
        onChangeText={setAmount} 
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Référence (optionnel)" 
        value={reference} 
        onChangeText={setReference} 
      />

      <Text style={[styles.labelTitle, { marginBottom: 8 }]}>Moyen de paiement</Text>
      <View style={styles.methodRow}>
        {['ESPECES', 'MOBILE_MONEY'].map((m) => (
          <TouchableOpacity key={m} style={[styles.methodChip, method === m && styles.methodChipActive]} onPress={() => setMethod(m)}>
            <Text style={[styles.methodChipText, method === m && styles.methodChipTextActive]}>{m === 'ESPECES' ? 'Espèces' : 'Mobile Money'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handlePay}>
        <Text style={styles.saveBtnText}>Enregistrer le paiement</Text>
      </TouchableOpacity>
      </View>
      </ScrollView>

      <Modal visible={!!recuData} transparent animationType="slide" onRequestClose={closeReceipt}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reçu généré</Text>
              <TouchableOpacity onPress={closeReceipt}>
                <Text style={styles.modalClose}>Fermer</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.receiptLine}>Montant: {Number(recuData?.montant || 0).toLocaleString('fr-FR')} FCFA</Text>
            <Text style={styles.receiptLine}>Total dû: {Number(recuData?.totalDu || 0).toLocaleString('fr-FR')} FCFA</Text>
            <Text style={styles.receiptLine}>Reste à payer: {Number(recuData?.resteAPayer || 0).toLocaleString('fr-FR')} FCFA</Text>
            <TouchableOpacity style={styles.saveBtn} onPress={shareReceiptPdf}>
              <Text style={styles.saveBtnText}>Partager le reçu PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f6f8fb' },
  headerRow: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef0f4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f4fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 20, color: '#1b2a4a', fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '900', color: '#1b2a4a' },
  container: { padding: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9edf5',
    borderRadius: 12,
    padding: 12,
  },
  labelTitle: { fontSize: 13, color: '#556483', fontWeight: '800' },
  label: { fontSize: 18, marginTop: 2, marginBottom: 8, fontWeight: '900', color: '#1d2c4d' },
  subLabel: { fontSize: 13, color: '#dc3545', marginBottom: 14, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#dfe5f1',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  methodChip: {
    borderWidth: 1,
    borderColor: '#dbe2ef',
    borderRadius: 999,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  methodChipActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  methodChipText: { color: '#2b3c62', fontWeight: '700' },
  methodChipTextActive: { color: '#fff' },
  saveBtn: {
    marginTop: 4,
    backgroundColor: '#0d6efd',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(10,18,35,0.45)', justifyContent: 'center', padding: 14 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1b2a4a' },
  modalClose: { color: '#dc3545', fontWeight: '800' },
  receiptLine: { color: '#26364f', fontWeight: '800', marginBottom: 8 },
});
