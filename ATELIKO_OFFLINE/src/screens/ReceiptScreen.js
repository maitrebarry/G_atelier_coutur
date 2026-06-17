import React, {useEffect, useRef, useState} from 'react';
import {Alert, NativeModules, Platform, ScrollView, Share, StyleSheet, Text, View} from 'react-native';
import {captureRef} from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import QRCode from 'qrcode-generator';
import AppButton from '../components/AppButton';
import QRCodeMatrix from '../components/QRCodeMatrix';
import {buildMovementReceipt, buildPaymentReceipt, buildCommandeReceipt, buildRendezvousReadyReceipt, formatReceiptDate} from '../services/receiptService';

const {WhatsAppPdfShare} = NativeModules;

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
}

function escapePdfString(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function drawQrCode(value, x, y, size) {
  const qr = QRCode(0, 'M');
  qr.addData(value || '');
  qr.make();
  const count = qr.getModuleCount();
  const moduleSize = size / count;
  const commands = ['0 g'];
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col)) {
        const px = (x + col * moduleSize).toFixed(2);
        const py = (y + (count - row - 1) * moduleSize).toFixed(2);
        const s = moduleSize.toFixed(2);
        commands.push(`${px} ${py} ${s} ${s} re f`);
      }
    }
  }
  return commands.join('\n');
}

function wrapPdfLine(line, maxLength = 38) {
  const words = String(line || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach(word => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function preparePdfLines(lines) {
  return lines.flatMap(line => {
    if (line === '') return [''];
    return String(line || '').length > 38 ? wrapPdfLine(line) : [line];
  });
}

function buildReceiptPdf(receipt) {
  const isReadyNotice = receipt.typeTicket === 'RDV_READY';
  const pageWidth = 226;
  const pageHeight = 620;
  const rawLines = isReadyNotice ? [
    `${receipt.atelierNom}`,
    `Adresse: ${receipt.atelierAdresse}`,
    `Telephone: ${receipt.atelierTelephone || ''}`,
    '',
    `${receipt.statut.toUpperCase()}`,
    `Reference: ${receipt.reference}`,
    `Date: ${formatReceiptDate(receipt.date)}`,
    `Client: ${receipt.beneficiaire}`,
    `Contact: ${receipt.contact || ''}`,
    receipt.nomModele ? `Habit: ${receipt.nomModele}` : null,
    receipt.dateRdv ? `Rendez-vous prevu: ${formatReceiptDate(receipt.dateRdv)}` : null,
    '',
    receipt.readyMessage || 'Votre commande est prete. Vous pouvez passer la recuperer.',
    '',
    'Scannez pour verifier ce message',
    `${receipt.messageMarketing || ''}`,
  ].filter(line => line !== null && line !== undefined) : [
    `${receipt.atelierNom}`,
    `Adresse: ${receipt.atelierAdresse}`,
    `Telephone: ${receipt.atelierTelephone || ''}`,
    '',
    `${receipt.statut.toUpperCase()}`,
    `Reference: ${receipt.reference}`,
    `Date: ${formatReceiptDate(receipt.date)}`,
    `Beneficiaire: ${receipt.beneficiaire}`,
    `Contact: ${receipt.contact || ''}`,
    `Reglement: ${receipt.moyenPaiement || ''}`,
    receipt.nomModele ? `Modele: ${receipt.nomModele}` : null,
    receipt.nombreModeles ? `Nombre de modeles: ${receipt.nombreModeles}` : null,
    receipt.quantite ? `Quantite: ${receipt.quantite}` : null,
    '',
    `Total du: ${formatMoney(receipt.totalDu)}`,
    `Avance payee: ${formatMoney(receipt.avancePaye)}`,
    `Reste a payer: ${formatMoney(receipt.resteAPayer)}`,
    `Montant: ${formatMoney(receipt.montant)}`,
    '',
    'Scannez pour verifier le recu',
    `${receipt.messageMarketing || ''}`,
  ].filter(line => line !== null && line !== undefined);
  const lines = preparePdfLines(rawLines);

  const commands = [];
  commands.push('1 1 1 rg 0 0 226 620 re f');
  commands.push('0 g');
  commands.push('BT /F2 13 Tf 14 588 Td (' + escapePdfString(lines[0]).toUpperCase() + ') Tj ET');
  let y = 568;
  lines.slice(1).forEach(line => {
    if (!line) {
      y -= 9;
      return;
    }
    const isTitle = line === receipt.statut.toUpperCase();
    commands.push(`BT /${isTitle ? 'F2' : 'F1'} ${isTitle ? 10 : 8} Tf 14 ${y} Td (${escapePdfString(line)}) Tj ET`);
    y -= isTitle ? 15 : 12;
  });
  commands.push('14 462 198 0.5 re f');
  commands.push('14 318 198 0.5 re f');
  commands.push(drawQrCode(receipt.qrCodeData, 63, 96, 100));
  commands.push('BT /F1 7 Tf 42 78 Td (Conservez ce ticket comme preuve.) Tj ET');
  commands.push('BT /F2 8 Tf 58 54 Td (Merci pour votre confiance.) Tj ET');

  const content = `${commands.join('\n')}\n`;
  const contentLength = content.length;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >> endobj`,
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${contentLength} >> stream\n${content}endstream endobj`,
    '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
  ];

  const header = '%PDF-1.3\n';
  let position = header.length;
  const xref = ['xref', '0 7', '0000000000 65535 f '];
  objects.forEach(item => {
    const offset = String(position).padStart(10, '0');
    xref.push(`${offset} 00000 n `);
    position += item.length + 1;
  });
  const xrefStart = position;
  const trailer = [`trailer << /Size 7 /Root 1 0 R >>`, `startxref`, `${xrefStart}`, `%%EOF`].join('\n');

  return `${header}${objects.join('\n')}\n${xref.join('\n')}\n${trailer}`;
}

const RECEIPT_PDF_DIR = `${RNFS.DocumentDirectoryPath}/receipts`;

function getReceiptPdfPath(receipt) {
  const safeReference = String(receipt.reference || 'receipt').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${RECEIPT_PDF_DIR}/${safeReference}.pdf`;
}

async function generateReceiptPdf(receipt) {
  try {
    const exists = await RNFS.exists(RECEIPT_PDF_DIR);
    if (!exists) await RNFS.mkdir(RECEIPT_PDF_DIR);
    const path = getReceiptPdfPath(receipt);
    const pdfContent = buildReceiptPdf(receipt);
    await RNFS.writeFile(path, pdfContent, 'utf8');
    return path;
  } catch (error) {
    throw new Error(`Impossible de générer le PDF: ${error.message || error}`);
  }
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
  if (receipt.typeTicket === 'RDV_READY') {
    return [
      `*${receipt.atelierNom}*`,
      `Bonjour ${receipt.beneficiaire},`,
      receipt.readyMessage || 'Votre commande est prête. Vous pouvez passer la récupérer.',
      receipt.nomModele ? `Habit: ${receipt.nomModele}` : null,
      receipt.dateRdv ? `Rendez-vous prévu: ${formatReceiptDate(receipt.dateRdv)}` : null,
      '',
      'L’image du reçu est jointe à ce message.',
    ].filter(Boolean).join('\n');
  }
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
  const {receiptType, idPaiement, idClient, idRendezvous, movementReference, autoWhatsApp = false} = route.params || {};
  const [receipt, setReceipt] = useState(null);
  const [imagePath, setImagePath] = useState(null);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageError, setImageError] = useState(null);
  const autoSentRef = useRef(false);
  const receiptRef = useRef(null);

  useEffect(() => {
    let request;
    if (receiptType === 'PAIEMENT') {
      request = buildPaymentReceipt(idPaiement);
    } else if (receiptType === 'COMMANDE') {
      request = buildCommandeReceipt(idClient);
    } else if (receiptType === 'RDV_READY') {
      request = buildRendezvousReadyReceipt(idRendezvous);
    } else {
      request = buildMovementReceipt(movementReference);
    }
    request.then(setReceipt);
  }, [receiptType, idPaiement, idClient, idRendezvous, movementReference]);

  const captureReceiptImage = async () => {
    if (!receiptRef.current) {
      throw new Error('Impossible de capturer le reçu.');
    }
    try {
      setImageGenerating(true);
      // Small delay to ensure the view is fully rendered before capture
      await new Promise(resolve => setTimeout(resolve, 400));
      const uri = await captureRef(receiptRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });
      // Copy to a persistent location with a meaningful name
      const safeRef = String(receipt?.reference || 'recu').replace(/[^a-zA-Z0-9_-]/g, '_');
      const destPath = `${RNFS.DocumentDirectoryPath}/receipts/${safeRef}.png`;
      const dirExists = await RNFS.exists(`${RNFS.DocumentDirectoryPath}/receipts`);
      if (!dirExists) await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/receipts`);
      if (await RNFS.exists(destPath)) await RNFS.unlink(destPath);
      await RNFS.copyFile(uri, destPath);
      setImagePath(destPath);
      return destPath;
    } catch (error) {
      throw new Error(`Impossible de capturer le reçu en image: ${error.message || error}`);
    } finally {
      setImageGenerating(false);
    }
  };

  const sendWhatsAppReceipt = async () => {
    if (!receipt) return;
    const phone = cleanPhone(receipt.contact);
    if (!phone) {
      Alert.alert('WhatsApp', 'Le numéro du client est introuvable sur ce reçu.');
      return;
    }
    try {
      const path = imagePath || await captureReceiptImage();
      setImagePath(path);
      const message = buildWhatsAppMessage(receipt);
      if (Platform.OS === 'android' && WhatsAppPdfShare?.shareImage) {
        await WhatsAppPdfShare.shareImage(path, phone, message);
      } else {
        await Share.share({
          title: 'Reçu thermique',
          message,
          url: path,
        });
      }
    } catch (error) {
      Alert.alert('WhatsApp', `Impossible de partager le reçu: ${error.message || error}`);
    }
  };

  useEffect(() => {
    if (!receipt) return;
    setImageError(null);
    let mounted = true;
    // Auto-generate the image once the receipt is loaded and rendered
    const timer = setTimeout(async () => {
      if (!mounted) return;
      try {
        await captureReceiptImage();
      } catch (_) {
        // Image will be generated on demand when sharing
      }
    }, 600);
    return () => { mounted = false; clearTimeout(timer); };
  }, [receipt]);

  useEffect(() => {
    if (!autoWhatsApp || !receipt || autoSentRef.current) return;
    autoSentRef.current = true;
    sendWhatsAppReceipt();
  }, [autoWhatsApp, receipt, imagePath]);

  if (!receipt) {
    return <View style={styles.center}><Text>Recu introuvable.</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View ref={receiptRef} collapsable={false} style={styles.ticket}>
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
        {receipt.nombreModeles ? <Row label="Nombre de modeles" value={receipt.nombreModeles} /> : null}
        <Row label="Quantite" value={receipt.quantite} />
        {receipt.dateRdv ? <Row label="Date du rendez-vous" value={formatReceiptDate(receipt.dateRdv)} /> : null}
        {receipt.typeTicket === 'RDV_READY' ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{receipt.readyMessage}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.divider}>--------------------------------</Text>
            <Row label="Total du" value={formatMoney(receipt.totalDu)} />
            <Row label="Avance payee" value={formatMoney(receipt.avancePaye)} />
            <Row label="Reste a payer" value={formatMoney(receipt.resteAPayer)} />
            <View style={styles.amountBox}>
              <Text style={styles.amountCaption}>{receipt.typeTicket === 'SORTIE' ? 'SORTIE HABIT' : receipt.typeTicket === 'ENTREE' ? 'ENTREE HABIT' : 'MONTANT ENCAISSE'}</Text>
              <Text style={styles.amount}>{formatMoney(receipt.montant)}</Text>
            </View>
          </>
        )}
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
      {imageError ? <Text style={styles.error}>{imageError}</Text> : null}
      {imageGenerating ? <Text style={styles.info}>Génération de l'image en cours...</Text> : null}
      {imagePath ? <Text style={styles.infoSuccess}>Image du reçu prête ✔</Text> : null}
      <View style={styles.actions}>
        <AppButton label="Envoyer le reçu sur WhatsApp" onPress={sendWhatsAppReceipt} variant="success" />
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
  noticeBox: {borderWidth: 1, borderColor: '#111', backgroundColor: '#f8fafc', padding: 12, marginVertical: 10},
  noticeText: {fontSize: 12, color: '#111', fontWeight: '800', textAlign: 'center', lineHeight: 18},
  qrWrap: {alignItems: 'center', marginVertical: 10, gap: 6},
  info: {textAlign: 'center', color: '#1d4ed8', marginTop: 10, fontSize: 12},
  infoSuccess: {textAlign: 'center', color: '#198754', marginTop: 6, fontSize: 12, fontWeight: '700'},
  error: {textAlign: 'center', color: '#b91c1c', marginTop: 10, fontSize: 12},
  thanks: {textAlign: 'center', fontWeight: '900', color: '#111', fontSize: 12},
  actions: {width: 300, marginTop: 12},
});
