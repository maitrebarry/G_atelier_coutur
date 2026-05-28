import React, {useEffect, useRef, useState} from 'react';
import {Alert, Linking, ScrollView, StyleSheet, Text, View} from 'react-native';
import AppButton from '../components/AppButton';
import QRCodeMatrix from '../components/QRCodeMatrix';
import {buildMovementReceipt, buildPaymentReceipt, formatReceiptDate} from '../services/receiptService';

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
}

function Row({label, value}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{String(value)}</Text>
    </View>
  );
}

function cleanPhone(value) {
  const digits = String(value || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits.replace('+', '');
  if (digits.length === 8) return `223${digits}`;
  return digits;
}

function buildWhatsAppMessage(receipt) {
  return [
    `*${receipt.atelierNom}*`,
    `${receipt.statut}`,
    `Référence: ${receipt.reference}`,
    `Date: ${formatReceiptDate(receipt.date)}`,
    `Client: ${receipt.beneficiaire}`,
    receipt.nomModele ? `Modèle: ${receipt.nomModele}` : null,
    `Montant: ${formatMoney(receipt.montant)}`,
    `Total dû: ${formatMoney(receipt.totalDu)}`,
    `Reste à payer: ${formatMoney(receipt.resteAPayer)}`,
    '',
    receipt.messageMarketing,
  ].filter(Boolean).join('\n');
}

export default function ReceiptScreen({route, navigation}) {
  const {receiptType, idPaiement, movementReference, autoWhatsApp = false} = route.params || {};
  const [receipt, setReceipt] = useState(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    const request = receiptType === 'PAIEMENT'
      ? buildPaymentReceipt(idPaiement)
      : buildMovementReceipt(movementReference);
    request.then(setReceipt);
  }, [receiptType, idPaiement, movementReference]);

  const sendWhatsApp = async () => {
    if (!receipt) return;
    const phone = cleanPhone(receipt.contact);
    if (!phone) {
      Alert.alert('WhatsApp', 'Le numéro du client est introuvable sur ce reçu.');
      return;
    }
    const text = encodeURIComponent(buildWhatsAppMessage(receipt));
    const appUrl = `whatsapp://send?phone=${phone}&text=${text}`;
    const webUrl = `https://wa.me/${phone}?text=${text}`;
    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpen ? appUrl : webUrl);
    } catch (e) {
      Alert.alert('WhatsApp', "Impossible d'ouvrir WhatsApp sur ce téléphone.");
    }
  };

  useEffect(() => {
    if (!autoWhatsApp || !receipt || autoSentRef.current) return;
    autoSentRef.current = true;
    sendWhatsApp();
  }, [autoWhatsApp, receipt]);

  if (!receipt) {
    return <View style={styles.center}><Text>Recu introuvable.</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.ticket}>
        <Text style={styles.brand}>{receipt.atelierNom}</Text>
        <Text style={styles.sub}>{receipt.atelierAdresse}</Text>
        {receipt.atelierTelephone ? <Text style={styles.sub}>{receipt.atelierTelephone}</Text> : null}
        <View style={styles.badge}><Text style={styles.badgeText}>{receipt.statut.toUpperCase()}</Text></View>
        <Text style={styles.divider}>--------------------------------</Text>
        <Text style={styles.section}>DETAILS DU TICKET</Text>
        <Row label="Reference" value={receipt.reference} />
        <Row label="Date" value={formatReceiptDate(receipt.date)} />
        <Row label="Beneficiaire" value={receipt.beneficiaire} />
        <Row label="Contact" value={receipt.contact} />
        <Row label="Reglement" value={receipt.moyenPaiement} />
        <Row label="Modele" value={receipt.nomModele} />
        <Row label="Quantite" value={receipt.quantite} />
        <Text style={styles.divider}>--------------------------------</Text>
        <Row label="Total du" value={formatMoney(receipt.totalDu)} />
        <Row label="Reste a payer" value={formatMoney(receipt.resteAPayer)} />
        <View style={styles.amountBox}>
          <Text style={styles.amountCaption}>{receipt.typeTicket === 'SORTIE' ? 'SORTIE HABIT' : receipt.typeTicket === 'ENTREE' ? 'ENTREE HABIT' : 'MONTANT'}</Text>
          <Text style={styles.amount}>{formatMoney(receipt.montant)}</Text>
        </View>
        <Text style={styles.section}>VERIFICATION</Text>
        <Text style={styles.sub}>Conservez ce ticket comme preuve.</Text>
        <View style={styles.qrWrap}>
          <QRCodeMatrix value={receipt.qrCodeData} />
          <Text style={styles.sub}>Scannez pour verifier le recu</Text>
        </View>
        <Text style={styles.divider}>--------------------------------</Text>
        <Text style={styles.thanks}>Merci pour votre confiance.</Text>
        <Text style={styles.sub}>{receipt.messageMarketing}</Text>
        <Text style={styles.sub}>{receipt.atelierNom}</Text>
      </View>
      <View style={styles.actions}>
        <AppButton label="Envoyer WhatsApp" onPress={sendWhatsApp} variant="success" />
        <AppButton label="Retour" onPress={() => navigation.goBack()} variant="ghost" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  page: {padding: 16, backgroundColor: '#f1f5f9', alignItems: 'center'},
  ticket: {width: 300, backgroundColor: '#fff', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#d1d5db'},
  brand: {textAlign: 'center', fontSize: 18, fontWeight: '900', color: '#111', textTransform: 'uppercase'},
  sub: {textAlign: 'center', fontSize: 11, color: '#555', marginTop: 2},
  badge: {alignSelf: 'center', backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6, marginTop: 10, borderRadius: 4},
  badgeText: {color: '#fff', fontSize: 10, fontWeight: '900'},
  divider: {textAlign: 'center', color: '#777', marginVertical: 8, fontSize: 11},
  section: {fontSize: 11, color: '#111', fontWeight: '900', marginBottom: 6},
  row: {flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 5},
  label: {fontSize: 11, color: '#555', fontWeight: '900', flex: 1},
  value: {fontSize: 11, color: '#111', flex: 1.5, textAlign: 'right'},
  amountBox: {borderWidth: 1, borderColor: '#111', backgroundColor: '#f8fafc', padding: 12, marginVertical: 10, alignItems: 'center'},
  amountCaption: {fontSize: 10, color: '#555', fontWeight: '900'},
  amount: {fontSize: 20, color: '#111', fontWeight: '900', marginTop: 3},
  qrWrap: {alignItems: 'center', marginVertical: 10, gap: 6},
  thanks: {textAlign: 'center', fontWeight: '900', color: '#111', fontSize: 12},
  actions: {width: 300, marginTop: 12},
});
