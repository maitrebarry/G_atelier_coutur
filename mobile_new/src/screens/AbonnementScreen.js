import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import api from '../api/backend';

const manualNumbers = {
  ORANGE_MONEY: '74745669',
  WAVE: '74745669',
  MOBICASH: '67205736',
};

export default function AbonnementScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [planCode, setPlanCode] = useState('MENSUEL');
  const [modePaiement, setModePaiement] = useState('ORANGE_MONEY');
  const [transactionRef, setTransactionRef] = useState('');
  const [ownerNote, setOwnerNote] = useState('');
  const [receipt, setReceipt] = useState(null);

  const [adminPlans, setAdminPlans] = useState([]);
  const [adminAteliers, setAdminAteliers] = useState([]);
  const [adminPayments, setAdminPayments] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('PENDING');
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);

  const [newPlan, setNewPlan] = useState({
    code: '',
    libelle: '',
    dureeMois: '1',
    prix: '0',
    devise: 'XOF',
    actif: true,
  });

  const isSuperAdmin = (userData?.role || '').toUpperCase() === 'SUPERADMIN';

  const loadData = async () => {
    setLoading(true);
    try {
      const baseCalls = [
        api.get('/subscription/current'),
        api.get('/subscription/plans'),
        api.get('/subscription/payments'),
      ];

      const adminCalls = isSuperAdmin
        ? [
            api.get('/admin/subscriptions/plans'),
            api.get('/admin/subscriptions/ateliers'),
            api.get(`/admin/subscriptions/payments?status=${encodeURIComponent(paymentFilter)}`),
          ]
        : [];

      const results = await Promise.all([...baseCalls, ...adminCalls]);
      const [currentRes, plansRes, paymentsRes, adminPlansRes, adminAteliersRes, adminPaymentsRes] = results;

      setCurrent(currentRes?.data || null);
      const plansData = Array.isArray(plansRes?.data) ? plansRes.data : [];
      setPlans(plansData);
      setPayments(Array.isArray(paymentsRes?.data) ? paymentsRes.data : []);

      if (plansData.length > 0) {
        setPlanCode(plansData[0]?.code || 'MENSUEL');
      }

      if (isSuperAdmin) {
        setAdminPlans(Array.isArray(adminPlansRes?.data) ? adminPlansRes.data : []);
        setAdminAteliers(Array.isArray(adminAteliersRes?.data) ? adminAteliersRes.data : []);
        setAdminPayments(Array.isArray(adminPaymentsRes?.data) ? adminPaymentsRes.data : []);
      }
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Impossible de charger les données abonnement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('userData');
      const u = raw ? JSON.parse(raw) : null;
      setUserData(u);
    })();
  }, []);

  useEffect(() => {
    if (!userData) return;
    loadData();
  }, [userData, paymentFilter, isSuperAdmin]);

  useEffect(() => {
    if (current?.dateFin) {
      const expirationDate = new Date(current.dateFin);
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (expirationDate < now) {
        setSubscriptionExpired(true);
        if (!isSuperAdmin) {
          Alert.alert(
            'Abonnement expiré',
            'Votre abonnement a expiré. Veuillez renouveler votre abonnement pour continuer à utiliser le service.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } else if (expirationDate <= oneWeekFromNow) {
        // Abonnement expire dans une semaine - modal d'info
        Alert.alert(
          'Abonnement bientôt expiré',
          `Votre abonnement expire le ${expirationDate.toLocaleDateString()}. Pensez à le renouveler.`,
          [{ text: 'OK' }]
        );
      }
    }
  }, [current, navigation, isSuperAdmin]);

  const pickReceipt = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const file = result.assets?.[0];
    if (!file) return;
    setReceipt({
      uri: file.uri,
      name: file.name || 'receipt',
      type: file.mimeType || 'application/octet-stream',
    });
  };

  const handleSubmitPayment = async () => {
    if (!receipt) {
      Alert.alert('Pièce jointe requise', 'Veuillez ajouter une preuve de paiement.');
      return;
    }

    const formData = new FormData();
    formData.append('planCode', planCode);
    if (modePaiement) formData.append('modePaiement', modePaiement);
    if (transactionRef) formData.append('transactionRef', transactionRef);
    if (ownerNote) formData.append('ownerNote', ownerNote);
    formData.append('receipt', receipt);

    try {
      setSubmitting(true);
      await api.post('/subscription/payments/manual-submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Succès', 'Demande envoyée au SuperAdmin pour validation.');
      setTransactionRef('');
      setOwnerNote('');
      setReceipt(null);
      await loadData();
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Échec de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const statusMeta = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'ACTIVE' || s === 'PAID') return { label: 'Actif', color: '#198754', bg: '#eafaf1' };
    if (s === 'PENDING') return { label: 'En attente', color: '#f59f00', bg: '#fff7e6' };
    if (s === 'FAILED' || s === 'REJECTED') return { label: 'Rejeté', color: '#dc3545', bg: '#fdecee' };
    if (s === 'CANCELED' || s === 'SUSPENDED') return { label: 'Suspendu', color: '#6c757d', bg: '#f1f3f5' };
    return { label: status || 'N/A', color: '#495057', bg: '#f8f9fa' };
  };

  const handleCreatePlan = async () => {
    if (!newPlan.code || !newPlan.libelle) {
      Alert.alert('Erreur', 'Code et libellé requis');
      return;
    }

    try {
      await api.post('/admin/subscriptions/plans', {
        code: newPlan.code,
        libelle: newPlan.libelle,
        dureeMois: Number(newPlan.dureeMois || 1),
        prix: Number(newPlan.prix || 0),
        devise: newPlan.devise || 'XOF',
        actif: !!newPlan.actif,
      });
      setNewPlan({ code: '', libelle: '', dureeMois: '1', prix: '0', devise: 'XOF', actif: true });
      loadData();
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Échec création plan');
    }
  };

  const handleTogglePlan = async (plan) => {
    try {
      await api.put(`/admin/subscriptions/plans/${encodeURIComponent(plan.code)}`, { actif: !plan.actif });
      loadData();
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Échec mise à jour plan');
    }
  };

  const handleDeletePlan = async (plan) => {
    Alert.alert('Confirmation', `Supprimer ${plan.code} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/subscriptions/plans/${encodeURIComponent(plan.code)}`);
            loadData();
          } catch (e) {
            Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Échec suppression plan');
          }
        },
      },
    ]);
  };

  const handleActivateAtelier = async (atelierId) => {
    try {
      await api.post(`/admin/subscriptions/ateliers/${atelierId}/activate`, { planCode: 'MENSUEL' });
      loadData();
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Échec activation');
    }
  };

  const handleSuspendAtelier = async (atelierId) => {
    try {
      await api.post(`/admin/subscriptions/ateliers/${atelierId}/suspend`);
      loadData();
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Échec suspension');
    }
  };

  const handleApprovePayment = async (paymentId) => {
    try {
      await api.post(`/admin/subscriptions/payments/${paymentId}/approve`);
      loadData();
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Échec approbation');
    }
  };

  const handleRejectPayment = async (paymentId) => {
    Alert.alert('Rejeter paiement', 'Confirmez-vous le rejet ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rejeter',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/admin/subscriptions/payments/${paymentId}/reject`, { reason: '' });
            loadData();
          } catch (e) {
            Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Échec rejet');
          }
        },
      },
    ]);
  };

  const paymentPlansList = useMemo(() => {
    return plans.map((p) => `${p.libelle || p.code} (${p.prix} ${p.devise || 'XOF'})`);
  }, [plans]);

  return (
    <View style={styles.page}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Abonnement</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : subscriptionExpired && !isSuperAdmin ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Abonnement expiré</Text>
          <Text style={styles.emptyText}>Votre abonnement a expiré. Veuillez renouveler votre abonnement pour continuer à utiliser le service.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gestion de l'abonnement</Text>
            <View style={styles.rowWrap}>
              <Text style={styles.itemText}><Text style={styles.itemLabel}>Atelier:</Text> {current?.atelierNom || '-'}</Text>
              <Text style={styles.itemText}><Text style={styles.itemLabel}>Plan:</Text> {current?.planLibelle || current?.planCode || '-'}</Text>
              <Text style={styles.itemText}><Text style={styles.itemLabel}>Statut:</Text> {statusMeta(current?.status).label}</Text>
              <Text style={styles.itemText}><Text style={styles.itemLabel}>Échéance:</Text> {current?.dateFin ? new Date(current.dateFin).toLocaleDateString() : '-'}</Text>
              <Text style={styles.itemText}><Text style={styles.itemLabel}>Jours restants:</Text> {current?.daysRemaining ?? '-'}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Soumettre une preuve de paiement</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Numéros Mobile Money du service</Text>
              <Text style={styles.infoText}>Orange Money: {manualNumbers.ORANGE_MONEY}</Text>
              <Text style={styles.infoText}>Wave: {manualNumbers.WAVE}</Text>
              <Text style={styles.infoText}>MobiCash: {manualNumbers.MOBICASH}</Text>
            </View>

            <Text style={styles.inputLabel}>Plan</Text>
            <View style={styles.optionRow}>
              {plans.map((p) => (
                <TouchableOpacity key={p.code} style={[styles.optionBtn, planCode === p.code && styles.optionBtnActive]} onPress={() => setPlanCode(p.code)}>
                  <Text style={[styles.optionText, planCode === p.code && styles.optionTextActive]}>{p.libelle || p.code}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {paymentPlansList.length === 0 && <Text style={styles.emptyText}>Aucun plan disponible</Text>}

            <Text style={styles.inputLabel}>Mode de paiement</Text>
            <View style={styles.optionRow}>
              {['ORANGE_MONEY', 'WAVE', 'MOBICASH'].map((m) => (
                <TouchableOpacity key={m} style={[styles.optionBtn, modePaiement === m && styles.optionBtnActive]} onPress={() => setModePaiement(m)}>
                  <Text style={[styles.optionText, modePaiement === m && styles.optionTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Référence transaction</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 9TQS-123"
              value={transactionRef}
              onChangeText={setTransactionRef}
            />

            <Text style={styles.inputLabel}>Note</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              multiline
              placeholder="Ajouter un message"
              value={ownerNote}
              onChangeText={setOwnerNote}
            />

            <Text style={styles.inputLabel}>Preuve de paiement</Text>
            <View style={styles.uploadRow}>
              <TouchableOpacity style={styles.outlineBtn} onPress={pickReceipt}>
                <Text style={styles.outlineBtnText}>Choisir un fichier</Text>
              </TouchableOpacity>
              <Text style={styles.uploadText}>{receipt?.name || 'Aucun fichier'}</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmitPayment} disabled={submitting}>
              <Text style={styles.primaryBtnText}>{submitting ? 'Envoi...' : 'Soumettre'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Historique des paiements</Text>
            {payments.length === 0 ? (
              <Text style={styles.emptyText}>Aucun paiement</Text>
            ) : (
              payments.map((p, idx) => {
                const meta = statusMeta(p.status || p.statut || '');
                return (
                  <View key={String(p.id || idx)} style={styles.paymentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentTitle}>{p.planLibelle || p.planCode || 'Plan'}</Text>
                      <Text style={styles.paymentSub}>{p.modePaiement || p.provider || '-'}</Text>
                      <Text style={styles.paymentSub}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {isSuperAdmin ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Administration abonnement</Text>

              <View style={styles.tabRow}>
                {[
                  { key: 'plans', label: 'Plans' },
                  { key: 'ateliers', label: 'Ateliers' },
                  { key: 'payments', label: 'Paiements' },
                ].map((t) => (
                  <TouchableOpacity key={t.key} style={[styles.tabBtn, adminTab === t.key && styles.tabBtnActive]} onPress={() => setAdminTab(t.key)}>
                    <Text style={[styles.tabBtnText, adminTab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {adminTab === 'plans' && (
                <View>
                  <Text style={styles.sectionTitle}>Créer un plan</Text>
                  <Text style={styles.inputLabel}>Code</Text>
                  <TextInput style={styles.input} placeholder="MENSUEL" value={newPlan.code} onChangeText={(v) => setNewPlan({ ...newPlan, code: v.toUpperCase() })} />
                  <Text style={styles.inputLabel}>Libellé</Text>
                  <TextInput style={styles.input} placeholder="Plan mensuel" value={newPlan.libelle} onChangeText={(v) => setNewPlan({ ...newPlan, libelle: v })} />
                  <Text style={styles.inputLabel}>Durée (mois)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={String(newPlan.dureeMois)} onChangeText={(v) => setNewPlan({ ...newPlan, dureeMois: v })} />
                  <Text style={styles.inputLabel}>Prix</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={String(newPlan.prix)} onChangeText={(v) => setNewPlan({ ...newPlan, prix: v })} />
                  <Text style={styles.inputLabel}>Devise</Text>
                  <TextInput style={styles.input} value={newPlan.devise} onChangeText={(v) => setNewPlan({ ...newPlan, devise: v })} />

                  <TouchableOpacity style={styles.primaryBtn} onPress={handleCreatePlan}>
                    <Text style={styles.primaryBtnText}>Créer le plan</Text>
                  </TouchableOpacity>

                  <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Plans existants</Text>
                  {adminPlans.length === 0 ? (
                    <Text style={styles.emptyText}>Aucun plan</Text>
                  ) : (
                    adminPlans.map((p) => (
                      <View key={p.id || p.code} style={styles.planRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.paymentTitle}>{p.libelle || p.code}</Text>
                          <Text style={styles.paymentSub}>{p.code} • {p.prix} {p.devise}</Text>
                          <Text style={styles.paymentSub}>Durée: {p.duree_mois || p.dureeMois} mois</Text>
                        </View>
                        <View style={styles.actionsCol}>
                          <TouchableOpacity style={styles.outlineBtn} onPress={() => handleTogglePlan(p)}>
                            <Text style={styles.outlineBtnText}>{p.actif ? 'Désactiver' : 'Activer'}</Text>
                          </TouchableOpacity>
                          {p.code !== 'MENSUEL' ? (
                            <TouchableOpacity style={styles.dangerBtn} onPress={() => handleDeletePlan(p)}>
                              <Text style={styles.dangerBtnText}>Supprimer</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {adminTab === 'ateliers' && (
                <View>
                  <Text style={styles.sectionTitle}>Ateliers & abonnements</Text>
                  {adminAteliers.length === 0 ? (
                    <Text style={styles.emptyText}>Aucun atelier</Text>
                  ) : (
                    adminAteliers.map((a, idx) => {
                      const meta = statusMeta(a.status || a.etat || a.subscription_status);
                      return (
                        <View key={String(a.atelier_id || idx)} style={styles.planRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.paymentTitle}>{a.atelier_nom || a.atelierNom || 'Atelier'}</Text>
                            <Text style={styles.paymentSub}>Plan: {a.plan_libelle || a.plan_libelle || a.plan_code || a.planCode || '-'}</Text>
                            <Text style={styles.paymentSub}>Échéance: {a.date_fin ? new Date(a.date_fin).toLocaleDateString() : '-'}</Text>
                          </View>
                          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                          </View>
                          <View style={styles.actionsCol}>
                            <TouchableOpacity style={styles.outlineBtn} onPress={() => handleActivateAtelier(a.atelier_id || a.atelierId)}>
                              <Text style={styles.outlineBtnText}>Activer</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.dangerBtn} onPress={() => handleSuspendAtelier(a.atelier_id || a.atelierId)}>
                              <Text style={styles.dangerBtnText}>Suspendre</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {adminTab === 'payments' && (
                <View>
                  <Text style={styles.sectionTitle}>Paiements</Text>
                  <View style={styles.optionRow}>
                    {[
                      { key: 'PENDING', label: 'En attente' },
                      { key: 'PAID', label: 'Payé' },
                      { key: 'FAILED', label: 'Échec' },
                      { key: 'ALL', label: 'Tous' },
                    ].map((s) => (
                      <TouchableOpacity
                        key={s.key}
                        style={[
                          styles.optionBtn,
                          (s.key === 'ALL' ? paymentFilter === '' : paymentFilter === s.key) && styles.optionBtnActive,
                        ]}
                        onPress={() => setPaymentFilter(s.key === 'ALL' ? '' : s.key)}
                      >
                        <Text style={[
                          styles.optionText,
                          (s.key === 'ALL' ? paymentFilter === '' : paymentFilter === s.key) && styles.optionTextActive,
                        ]}
                        >
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {adminPayments.length === 0 ? (
                    <Text style={styles.emptyText}>Aucun paiement</Text>
                  ) : (
                    adminPayments.map((p, idx) => {
                      const meta = statusMeta(p.status || p.statut || '');
                      return (
                        <View key={String(p.id || idx)} style={styles.paymentRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.paymentTitle}>{p.atelierNom || p.atelier_nom || 'Atelier'} • {p.planCode || p.plan_code}</Text>
                            <Text style={styles.paymentSub}>{p.montant || p.amount || '-'} {p.devise || 'XOF'}</Text>
                            <Text style={styles.paymentSub}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}</Text>
                          </View>
                          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                          </View>
                          {(String(p.status || '').toUpperCase() === 'PENDING') && (
                            <View style={styles.actionsCol}>
                              <TouchableOpacity style={styles.outlineBtn} onPress={() => handleApprovePayment(p.id)}>
                                <Text style={styles.outlineBtnText}>Approuver</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.dangerBtn} onPress={() => handleRejectPayment(p.id)}>
                                <Text style={styles.dangerBtnText}>Rejeter</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>
      )}
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
  title: { fontSize: 20, fontWeight: '900', color: '#1b2a4a' },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5eaf3',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
  },
  cardTitle: { fontWeight: '900', color: '#1b2a4a', marginBottom: 8 },
  rowWrap: { gap: 6 },
  itemText: { color: '#334155' },
  itemLabel: { fontWeight: '700' },
  infoBox: { backgroundColor: '#eef6ff', padding: 10, borderRadius: 10, marginBottom: 10 },
  infoTitle: { fontWeight: '800', marginBottom: 4, color: '#1b2a4a' },
  infoText: { color: '#334155' },
  inputLabel: { fontWeight: '700', color: '#1b2a4a', marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: '#f8f9fc',
    borderWidth: 1,
    borderColor: '#e5eaf3',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 6,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  optionBtn: { borderWidth: 1, borderColor: '#ccd6eb', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  optionBtnActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  optionText: { color: '#344563', fontWeight: '700', fontSize: 12 },
  optionTextActive: { color: '#fff' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  uploadText: { color: '#6b7a95', flex: 1 },
  primaryBtn: { backgroundColor: '#0d6efd', paddingHorizontal: 14, borderRadius: 10, height: 40, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  outlineBtn: { borderWidth: 1, borderColor: '#0d6efd', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  outlineBtnText: { color: '#0d6efd', fontWeight: '700', fontSize: 12 },
  dangerBtn: { borderWidth: 1, borderColor: '#dc3545', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  dangerBtnText: { color: '#dc3545', fontWeight: '700', fontSize: 12 },
  emptyText: { textAlign: 'center', color: '#66758f', marginTop: 8 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eef0f4', gap: 8 },
  paymentTitle: { fontWeight: '800', color: '#1d2c4d' },
  paymentSub: { color: '#6b7a95', fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontWeight: '800', fontSize: 12 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tabBtn: { borderWidth: 1, borderColor: '#ccd6eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  tabBtnText: { fontWeight: '700', color: '#344563' },
  tabBtnTextActive: { color: '#fff' },
  sectionTitle: { fontWeight: '900', color: '#1b2a4a', marginBottom: 8 },
  planRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eef0f4', gap: 8 },
  actionsCol: { gap: 6, marginLeft: 8 },
});
