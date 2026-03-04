import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, ScrollView, Modal, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../api/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PaiementsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('clients');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [atelierId, setAtelierId] = useState('');
  const [userData, setUserData] = useState(null);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [saving, setSaving] = useState(false);
  const [recuData, setRecuData] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    montant: '',
    moyen: 'ESPECES',
    reference: '',
    datePaiement: new Date().toISOString().split('T')[0],
  });

  const role = (userData?.role || '').toUpperCase();
  const permissions = Array.isArray(userData?.permissions)
    ? userData.permissions.map((p) => (typeof p === 'string' ? p : p?.code)).filter(Boolean)
    : [];
  const hasPermission = (code) => {
    if (!code) return true;
    if (['SUPERADMIN', 'PROPRIETAIRE'].includes(role)) return true;
    return permissions.includes(code);
  };
  const canViewPaiements = hasPermission('PAIEMENT_VOIR');

  const statusMeta = useMemo(
    () => ({
      EN_ATTENTE: { label: 'En attente', color: '#dc3545', bg: '#fdecee' },
      PARTIEL: { label: 'Partiel', color: '#f59f00', bg: '#fff7e6' },
      PAYE: { label: 'Payé', color: '#198754', bg: '#eafaf1' },
    }),
    []
  );

  const normalize = (raw = {}) => {
    if (activeTab === 'clients') {
      return {
        id: raw.clientId || raw.id,
        nom: raw.clientNom || raw.nom || '',
        prenom: raw.clientPrenom || raw.prenom || '',
        telephone: raw.clientTelephone || raw.contact || '',
        total: Number(raw.prixTotal || 0),
        paye: Number(raw.montantPaye || 0),
        reste: Number(raw.resteAPayer || 0),
        statutPaiement: raw.statutPaiement || 'EN_ATTENTE',
        raw,
      };
    }
    return {
      id: raw.tailleurId || raw.id,
      nom: raw.tailleurNom || raw.nom || '',
      prenom: raw.tailleurPrenom || raw.prenom || '',
      telephone: raw.tailleurTelephone || raw.contact || '',
      total: Number(raw.totalDu || 0),
      paye: Number(raw.montantPaye || 0),
      reste: Number(raw.resteAPayer || 0),
      statutPaiement: raw.statutPaiement || 'EN_ATTENTE',
      raw,
    };
  };

  const fetchClients = async () => {
    if (!atelierId || !canViewPaiements) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      const endpoint = activeTab === 'clients' ? '/paiements/clients/recherche' : '/paiements/tailleurs/recherche';
      const params = [`atelierId=${atelierId}`];
      if (search?.trim()) params.push(`searchTerm=${encodeURIComponent(search.trim())}`);
      if (statut) params.push(`statutPaiement=${statut}`);

      const res = await api.get(`${endpoint}?${params.join('&')}`);
      const data = res.data.data || res.data || [];
      const arr = Array.isArray(data) ? data : [];
      setItems(arr.map(normalize));
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('userData');
        const u = raw ? JSON.parse(raw) : null;
        setUserData(u);
        setAtelierId(String(u?.atelierId || u?.atelier?.id || ''));
      } catch {
        setUserData(null);
      }
    })();
  }, []);

  useEffect(() => {
    fetchClients();
  }, [search, statut, activeTab, atelierId, canViewPaiements]);

  useEffect(() => {
    setSelected(null);
    setDetails(null);
    setPaymentForm((prev) => ({
      ...prev,
      montant: '',
      reference: `REF-${activeTab === 'clients' ? 'CLI' : 'TAI'}-${Date.now().toString().slice(-6)}`,
    }));
  }, [activeTab]);

  const loadDetails = async (item) => {
    if (!item?.id || !atelierId) return;
    try {
      const endpoint = activeTab === 'clients'
        ? `/paiements/clients/${item.id}?atelierId=${atelierId}`
        : `/paiements/tailleurs/${item.id}?atelierId=${atelierId}`;
      const res = await api.get(endpoint);
      setDetails(res.data || null);
    } catch (e) {
      setDetails(null);
    }
  };

  const handleSelect = (item) => {
    setSelected(item);
    loadDetails(item);
    setPaymentForm((prev) => ({
      ...prev,
      montant: '',
      reference: `REF-${activeTab === 'clients' ? 'CLI' : 'TAI'}-${Date.now().toString().slice(-6)}`,
    }));
  };

  const handlePayment = async () => {
    if (!selected?.id) return;
    const montant = Number(paymentForm.montant || 0);
    const reste = Number(selected.reste || 0);
    if (montant <= 0) return;
    if (montant > reste) return;

    try {
      setSaving(true);
      const payload = {
        montant,
        moyen: paymentForm.moyen,
        reference: paymentForm.reference || `REF-${activeTab === 'clients' ? 'CLI' : 'TAI'}-${Date.now().toString().slice(-6)}`,
        atelierId,
        ...(activeTab === 'clients' ? { clientId: selected.id } : { tailleurId: selected.id }),
      };

      const res = await api.post(activeTab === 'clients' ? '/paiements/clients' : '/paiements/tailleurs', payload);
      const paiementId = res?.data?.id;
      if (paiementId) {
        try {
          const recuRes = await api.get(`/paiements/recu/${activeTab === 'clients' ? 'client' : 'tailleur'}/${paiementId}?atelierId=${atelierId}`);
          setRecuData(recuRes?.data || null);
        } catch (e) {
          setRecuData(null);
        }
      }
      await fetchClients();
      await loadDetails(selected);
      setPaymentForm((prev) => ({ ...prev, montant: '' }));
      Alert.alert('Succès', 'Paiement enregistré avec succès');
    } finally {
      setSaving(false);
    }
  };

  const buildReceiptHtml = (recu) => {
    if (!recu) return '';
    const name = recu.clientNom
      ? `${recu.clientPrenom || ''} ${recu.clientNom || ''}`.trim()
      : `${recu.tailleurPrenom || ''} ${recu.tailleurNom || ''}`.trim();
    const dateStr = recu.datePaiement
      ? new Date(recu.datePaiement).toLocaleDateString('fr-FR')
      : '';
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #2c3e50; }
            .header { text-align: center; margin-bottom: 16px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .header h2 { margin: 0; font-size: 20px; text-transform: uppercase; }
            .header p { margin: 2px 0; color: #7f8c8d; font-size: 12px; }
            .row { display: flex; justify-content: space-between; margin: 8px 0; }
            .label { color: #7f8c8d; font-weight: bold; }
            .value { font-weight: 600; }
            .amount-box { margin: 16px 0; padding: 12px; border: 2px dashed #2c3e50; text-align: center; border-radius: 10px; }
            .amount-box .amount { font-size: 22px; font-weight: bold; }
            .amount-box .method { font-size: 12px; color: #7f8c8d; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${recu.atelierNom || 'Atelier'}</h2>
            ${recu.atelierAdresse ? `<p>${recu.atelierAdresse}</p>` : ''}
            ${recu.atelierTelephone ? `<p>${recu.atelierTelephone}</p>` : ''}
          </div>
          <div class="row"><span class="label">Référence</span><span class="value">${recu.reference || ''}</span></div>
          <div class="row"><span class="label">Date</span><span class="value">${dateStr}</span></div>
          <div class="row"><span class="label">Client/Tailleur</span><span class="value">${name}</span></div>
          <div class="amount-box">
            <div class="amount">${Number(recu.montant || 0).toLocaleString('fr-FR')} FCFA</div>
            <div class="method">${recu.moyenPaiement || ''}</div>
          </div>
        </body>
      </html>
    `;
  };

  const shareReceiptPdf = async () => {
    if (!recuData) return;
    try {
      const html = buildReceiptHtml(recuData);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Partage indisponible', 'Le partage de PDF n’est pas disponible sur cet appareil.');
        return;
      }
      await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      // ignore
    }
  };

  const printReceiptPdf = async () => {
    if (!recuData) return;
    try {
      const html = buildReceiptHtml(recuData);
      await Print.printAsync({ html });
    } catch (e) {
      // ignore
    }
  };

  const renderItem = ({ item }) => {
    const s = statusMeta[item.statutPaiement] || { label: item.statutPaiement || '—', color: '#6c757d', bg: '#f2f4f7' };
    const percent = item.total > 0 ? Math.min(100, Math.round((item.paye / item.total) * 100)) : 0;

    return (
      <TouchableOpacity
        style={[styles.card, selected?.id === item.id && styles.cardSelected]}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.name}>{item.prenom} {item.nom}</Text>
          <View style={[styles.statusChip, { borderColor: s.color, backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
          </View>
        </View>
        <Text style={styles.sub}>{item.telephone || 'Contact non renseigné'}</Text>
        <View style={styles.metricsRow}>
          <Text style={styles.metric}>Total: {item.total.toLocaleString('fr-FR')} FCFA</Text>
          <Text style={styles.metric}>Payé: {item.paye.toLocaleString('fr-FR')} FCFA</Text>
          <Text style={[styles.metric, { color: '#dc3545' }]}>Reste: {item.reste.toLocaleString('fr-FR')} FCFA</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.percentText}>{percent}% réglé</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Paiements</Text>
        <View style={{ width: 34 }} />
      </View>

      {!canViewPaiements ? (
        <View style={styles.noPermissionBox}>
          <Text style={styles.noPermissionText}>Vous n'avez pas la permission de voir les paiements.</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
            ListHeaderComponent={
              <View>
                <View style={styles.tabsRow}>
                  <TouchableOpacity style={[styles.tabBtn, activeTab === 'clients' && styles.tabBtnActive]} onPress={() => setActiveTab('clients')}>
                    <Text style={[styles.tabText, activeTab === 'clients' && styles.tabTextActive]}>Clients</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.tabBtn, activeTab === 'tailleurs' && styles.tabBtnActive]} onPress={() => setActiveTab('tailleurs')}>
                    <Text style={[styles.tabText, activeTab === 'tailleurs' && styles.tabTextActive]}>Tailleurs</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.search}
                  placeholder={`Rechercher ${activeTab === 'clients' ? 'un client' : 'un tailleur'}...`}
                  value={search}
                  onChangeText={setSearch}
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                  {['', 'EN_ATTENTE', 'PARTIEL', 'PAYE'].map((s) => (
                    <TouchableOpacity key={`status-${s || 'ALL'}`} style={[styles.filterChip, statut === s && styles.filterChipActive]} onPress={() => setStatut(s)}>
                      <Text style={[styles.filterChipText, statut === s && styles.filterChipTextActive]}>{s || 'Tous statuts'}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {loading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
              </View>
            }
            ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Aucun résultat trouvé.</Text> : null}
            renderItem={renderItem}
          />

          {selected ? (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Détails</Text>
              <Text style={styles.detailName}>{selected.prenom} {selected.nom}</Text>
              <Text style={styles.detailLine}>Total: {selected.total.toLocaleString('fr-FR')} FCFA</Text>
              <Text style={styles.detailLine}>Payé: {selected.paye.toLocaleString('fr-FR')} FCFA</Text>
              <Text style={styles.detailLine}>Reste: {selected.reste.toLocaleString('fr-FR')} FCFA</Text>

              {details?.historiquePaiements?.length ? (
                <View style={styles.historyBox}>
                  <Text style={styles.historyTitle}>Historique</Text>
                  {details.historiquePaiements.map((p, idx) => (
                    <View key={`pay-${idx}`} style={styles.historyRow}>
                      <View>
                        <Text style={styles.historyDate}>{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</Text>
                        <Text style={styles.historySub}>{p.moyen}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.historyAmount}>{Number(p.montant || 0).toLocaleString('fr-FR')} FCFA</Text>
                        <Text style={styles.historySub}>{p.reference}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {selected ? (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Nouveau paiement</Text>

              <TextInput
                style={styles.input}
                placeholder="Montant (FCFA)"
                keyboardType="numeric"
                value={paymentForm.montant}
                onChangeText={(v) => setPaymentForm((prev) => ({ ...prev, montant: v }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Référence"
                value={paymentForm.reference}
                onChangeText={(v) => setPaymentForm((prev) => ({ ...prev, reference: v }))}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.methodRow}>
                {['ESPECES', 'MOBILE_MONEY'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.methodChip, paymentForm.moyen === m && styles.methodChipActive]}
                    onPress={() => setPaymentForm((prev) => ({ ...prev, moyen: m }))}
                  >
                    <Text style={[styles.methodChipText, paymentForm.moyen === m && styles.methodChipTextActive]}>
                      {m === 'ESPECES' ? 'Espèces' : 'Mobile Money'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.saveBtn} onPress={handlePayment} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Enregistrement...' : 'Enregistrer le paiement'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      )}

      <Modal visible={!!recuData} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reçu de paiement</Text>
            {recuData ? (
              <>
                <Text style={styles.modalSub}>{recuData.atelierNom || 'Atelier'}</Text>
                <Text style={styles.modalSub}>{recuData.atelierAdresse || ''}</Text>
                <Text style={styles.modalSub}>{recuData.atelierTelephone || ''}</Text>

                <View style={styles.modalLine}>
                  <Text style={styles.modalLabel}>Référence</Text>
                  <Text style={styles.modalValue}>{recuData.reference}</Text>
                </View>
                <View style={styles.modalLine}>
                  <Text style={styles.modalLabel}>Date</Text>
                  <Text style={styles.modalValue}>{recuData.datePaiement ? new Date(recuData.datePaiement).toLocaleDateString('fr-FR') : '—'}</Text>
                </View>
                <View style={styles.modalLine}>
                  <Text style={styles.modalLabel}>Client/Tailleur</Text>
                  <Text style={styles.modalValue}>{recuData.clientNom ? `${recuData.clientPrenom || ''} ${recuData.clientNom || ''}`.trim() : `${recuData.tailleurPrenom || ''} ${recuData.tailleurNom || ''}`.trim()}</Text>
                </View>
                <View style={styles.amountBox}>
                  <Text style={styles.amountValue}>{Number(recuData.montant || 0).toLocaleString('fr-FR')} FCFA</Text>
                  <Text style={styles.amountLabel}>{recuData.moyenPaiement || ''}</Text>
                </View>
              </>
            ) : null}

            <TouchableOpacity style={styles.saveBtn} onPress={() => setRecuData(null)}>
              <Text style={styles.saveBtnText}>Fermer</Text>
            </TouchableOpacity>
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={[styles.iconBtn, styles.shareBtn]} onPress={shareReceiptPdf}>
                <Text style={styles.iconText}>📤</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, styles.printBtn]} onPress={printReceiptPdf}>
                <Text style={styles.iconText}>🖨️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },
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
  tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  tabBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbe2ef',
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 9,
  },
  tabBtnActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  tabText: { color: '#2b3c62', fontWeight: '800' },
  tabTextActive: { color: '#fff' },
  search: {
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#dfe5f1',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  filterRow: { gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  filterChip: {
    borderWidth: 1,
    borderColor: '#dbe2ef',
    borderRadius: 999,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  filterChipText: { color: '#2b3c62', fontWeight: '700' },
  filterChipTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5eaf3',
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
  },
  cardSelected: { borderColor: '#0d6efd', backgroundColor: '#f0f6ff' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '900', color: '#1d2c4d' },
  sub: { marginTop: 4, fontSize: 12, color: '#66758f' },
  metricsRow: { marginTop: 8 },
  metric: { fontSize: 12, color: '#4f5f80', marginBottom: 2, fontWeight: '700' },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontWeight: '900', fontSize: 12 },
  progressTrack: {
    marginTop: 8,
    height: 6,
    backgroundColor: '#e9edf5',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 999, backgroundColor: '#0d6efd' },
  percentText: { marginTop: 4, fontSize: 11, color: '#64708b', fontWeight: '700', textAlign: 'right' },
  noPermissionBox: {
    margin: 16,
    backgroundColor: '#fff3f3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffd6d6',
    padding: 14,
  },
  noPermissionText: { color: '#a52a2a', fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#66758f', marginTop: 20 },
  detailCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9edf5',
    borderRadius: 12,
    padding: 12,
  },
  detailTitle: { fontWeight: '900', color: '#203155', marginBottom: 8, fontSize: 16 },
  detailName: { fontSize: 18, fontWeight: '900', color: '#1d2c4d', marginBottom: 4 },
  detailLine: { color: '#4f5f80', marginTop: 2, fontWeight: '700' },
  historyBox: { marginTop: 10 },
  historyTitle: { fontWeight: '800', color: '#6b7a95', marginBottom: 6 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#eef0f4', paddingBottom: 6 },
  historyDate: { fontWeight: '800', color: '#1d2c4d' },
  historyAmount: { fontWeight: '900', color: '#1d2c4d' },
  historySub: { color: '#6b7a95', fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#dfe5f1',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  methodRow: { gap: 8, paddingVertical: 2, marginBottom: 12 },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,18,35,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1b2a4a', marginBottom: 6 },
  modalSub: { color: '#6b7a95', marginBottom: 2 },
  modalLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modalLabel: { color: '#6b7a95', fontWeight: '700' },
  modalValue: { color: '#1d2c4d', fontWeight: '900' },
  amountBox: {
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#1d2c4d',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  amountValue: { fontSize: 20, fontWeight: '900', color: '#1d2c4d' },
  amountLabel: { marginTop: 4, color: '#6b7a95', fontWeight: '700' },
  modalActionsRow: { marginTop: 10, flexDirection: 'row', gap: 8, justifyContent: 'center' },
  iconBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff66',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  iconText: { fontSize: 22, color: '#fff' },
  shareBtn: { backgroundColor: '#198754' },
  printBtn: { backgroundColor: '#dc3545' },
});
