import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, ScrollView, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, BottomBar } from '../components/MobileShell';
import api from '../api/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MOYENS = [
  { key: 'ESPECES',      label: '💵 Espèces' },
  { key: 'MOBILE_MONEY', label: '📱 Mobile Money' },
  { key: 'VIREMENT',     label: '🏦 Virement' },
];

const FILTERS = [
  { key: 'tous',     label: 'Tous' },
  { key: 'a_regler', label: 'À régler' },
  { key: 'solde',    label: 'Soldés' },
  { key: 'sans_cde', label: 'Sans commande' },
];

export default function PaiementsScreen({ navigation }) {
  const [activeTab, setActiveTab]     = useState('clients');
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [atelierId, setAtelierId]     = useState('');
  const [userData, setUserData]       = useState(null);
  const [search, setSearch]           = useState('');
  const [filterMode, setFilterMode]   = useState('tous');
  const [selected, setSelected]       = useState(null);
  const [details, setDetails]         = useState(null);
  const [saving, setSaving]           = useState(false);
  const [sortieLoading, setSortieLoading] = useState(false);
  const [synthese, setSynthese]       = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    montant: '', moyen: 'ESPECES', note: '',
  });

  const role = (userData?.role || '').toUpperCase();
  const permissions = Array.isArray(userData?.permissions)
    ? userData.permissions.map((p) => (typeof p === 'string' ? p : p?.code)).filter(Boolean)
    : [];
  const hasPermission = (code) => {
    if (['SUPERADMIN', 'PROPRIETAIRE'].includes(role)) return true;
    return permissions.includes(code);
  };
  const canViewPaiements  = hasPermission('PAIEMENT_VOIR');
  const canCreatePaiement = hasPermission('PAIEMENT_CREER');

  const normalize = useCallback((raw = {}) => {
    if (activeTab === 'clients') {
      const total = Number(raw.prixTotal || raw.montantTotal || raw.totalDu || 0);
      const paye  = Number(raw.montantPaye || raw.totalPaye || 0);
      const reste = Number(raw.resteAPayer || raw.montantRestant || Math.max(0, total - paye) || 0);
      return {
        id:          raw.clientId || raw.id,
        nom:         raw.clientNom || raw.nom || '',
        prenom:      raw.clientPrenom || raw.prenom || '',
        telephone:   raw.clientTelephone || raw.contact || raw.telephone || '',
        total, paye, reste,
        estSolde:    raw.estSolde ?? (total > 0 && reste <= 0),
        nbMesures:   raw.nbMesures || 0,
        nbSansLivraison: raw.nbMesuresSansLivraison ?? raw.nbSansLivraison ?? 0,
        sansCde:     !raw.nbMesures && total <= 0,
        raw,
      };
    }
    const total = Number(raw.totalDu || raw.montantTotal || 0);
    const paye  = Number(raw.totalPaye || raw.montantPaye || 0);
    const reste = Number(raw.resteAPayer || raw.montantRestant || Math.max(0, total - paye) || 0);
    return {
      id:          raw.tailleurId || raw.id,
      nom:         raw.tailleurNom || raw.nom || '',
      prenom:      raw.tailleurPrenom || raw.prenom || '',
      telephone:   raw.tailleurTelephone || raw.contact || raw.telephone || '',
      total, paye, reste,
      estSolde:    total > 0 && reste <= 0,
      nbMesures:   0,
      nbSansLivraison: 0,
      sansCde:     total <= 0,
      raw,
    };
  }, [activeTab]);

  const fetchSynthese = async (atId) => {
    if (!atId) return;
    try {
      const res = await api.get(`/paiements/synthese?atelierId=${atId}`);
      setSynthese(res.data || null);
    } catch { setSynthese(null); }
  };

  const fetchItems = async (atId, tab) => {
    if (!atId || !canViewPaiements) { setItems([]); return; }
    try {
      setLoading(true);
      const endpoint = tab === 'clients' ? '/paiements/clients/recherche' : '/paiements/tailleurs/recherche';
      const params = [`atelierId=${atId}`];
      if (search?.trim()) params.push(`searchTerm=${encodeURIComponent(search.trim())}`);
      const res = await api.get(`${endpoint}?${params.join('&')}`);
      const arr = Array.isArray(res.data?.data || res.data) ? (res.data?.data || res.data) : [];
      setItems(arr.map((r) => normalize(r)));
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    AsyncStorage.getItem('userData').then((raw) => {
      const u = raw ? JSON.parse(raw) : null;
      setUserData(u);
      const atId = String(u?.atelierId || u?.atelier?.id || '');
      setAtelierId(atId);
      fetchSynthese(atId);
    }).catch(() => setUserData(null));
  }, []);

  useEffect(() => { fetchItems(atelierId, activeTab); }, [search, activeTab, atelierId]);

  useEffect(() => {
    setSelected(null);
    setDetails(null);
    setFilterMode('tous');
    setPaymentForm({ montant: '', moyen: 'ESPECES', note: '' });
  }, [activeTab]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterMode === 'a_regler') return item.total > 0 && item.reste > 0;
      if (filterMode === 'solde')    return item.estSolde;
      if (filterMode === 'sans_cde') return item.sansCde;
      return true;
    });
  }, [items, filterMode]);

  const loadDetails = async (item) => {
    if (!item?.id || !atelierId) return;
    try {
      const ep = activeTab === 'clients'
        ? `/paiements/clients/${item.id}?atelierId=${atelierId}`
        : `/paiements/tailleurs/${item.id}?atelierId=${atelierId}`;
      const res = await api.get(ep);
      setDetails(res.data || null);
    } catch { setDetails(null); }
  };

  const handleSelect = (item) => {
    if (selected?.id === item.id) { setSelected(null); setDetails(null); return; }
    setSelected(item);
    loadDetails(item);
    setPaymentForm({ montant: '', moyen: 'ESPECES', note: '' });
  };

  const sendWhatsAppReceipt = async (recu) => {
    if (!recu) return;
    const name = recu.beneficiaire
      || (recu.clientNom ? `${recu.clientPrenom || ''} ${recu.clientNom}`.trim() : null)
      || (recu.tailleurNom ? `${recu.tailleurPrenom || ''} ${recu.tailleurNom}`.trim() : null)
      || 'Client';
    const tel = (recu.clientTelephone || recu.tailleurTelephone || recu.clientContact || recu.tailleurContact || '').replace(/\D/g, '');
    const atelierNom = recu.atelierNom || 'ATELIKO';

    const lines = [
      `*${atelierNom}*`,
      '─────────────────',
      '🧾 *Reçu de paiement*',
      `Réf : ${recu.reference || ''}`,
      `Date : ${recu.datePaiement ? new Date(recu.datePaiement).toLocaleDateString('fr-FR') : ''}`,
      `Bénéficiaire : ${name}`,
    ];
    if (Array.isArray(recu.mesures) && recu.mesures.length > 0) {
      lines.push('─────────────────');
      lines.push('*Commandes :*');
      recu.mesures.forEach((m, i) => {
        const label = m.modeleNom || m.typeVetement || `Commande ${i + 1}`;
        lines.push(`  ${i + 1}. ${label} — ${Number(m.prix || 0).toLocaleString('fr-FR')} F`);
      });
    }
    lines.push('─────────────────');
    lines.push(`💰 Total dû : ${Number(recu.totalDu || recu.montantTotal || 0).toLocaleString('fr-FR')} FCFA`);
    lines.push(`✅ Versé : ${Number(recu.avancePaye || recu.montantPaye || recu.avance || 0).toLocaleString('fr-FR')} FCFA`);
    const reste = Number(recu.resteAPayer || 0);
    if (reste > 0) {
      lines.push(`⏳ Reste : *${reste.toLocaleString('fr-FR')} FCFA*`);
    } else {
      lines.push('🎉 *Compte soldé !*');
    }
    lines.push('─────────────────');
    lines.push(`Merci de faire confiance à *${atelierNom}* !`);

    const text    = lines.join('\n');
    const encoded = encodeURIComponent(text);

    if (tel) {
      const deepLink = `whatsapp://send?phone=${tel}&text=${encoded}`;
      const webLink  = `https://wa.me/${tel}?text=${encoded}`;
      try {
        const canOpen = await Linking.canOpenURL(deepLink);
        await Linking.openURL(canOpen ? deepLink : webLink);
      } catch {
        try { await Linking.openURL(webLink); } catch {}
      }
    } else {
      Alert.alert(
        'Reçu prêt',
        `Aucun numéro WhatsApp trouvé.\n\nContenu :\n${text}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleShowRecu = async (item) => {
    if (!item?.id) return;
    try {
      const ep = activeTab === 'clients'
        ? `/paiements/recu/client/due/${item.id}?atelierId=${atelierId}`
        : `/paiements/recu/tailleur/${item.id}?atelierId=${atelierId}`;
      const res = await api.get(ep);
      const recu = res?.data;
      if (recu) await sendWhatsAppReceipt(recu);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger le reçu');
    }
  };

  const handlePayment = async () => {
    if (!selected?.id) return;
    const montant = Number(paymentForm.montant || 0);
    if (montant <= 0) { Alert.alert('Erreur', 'Montant invalide'); return; }
    if (montant > selected.reste) { Alert.alert('Erreur', 'Montant supérieur au reste dû'); return; }
    try {
      setSaving(true);
      const payload = {
        montant,
        moyen: paymentForm.moyen,
        note:  paymentForm.note || undefined,
        atelierId,
        ...(activeTab === 'clients' ? { clientId: selected.id } : { tailleurId: selected.id }),
      };
      const res = await api.post(activeTab === 'clients' ? '/paiements/clients' : '/paiements/tailleurs', payload);
      await fetchItems(atelierId, activeTab);
      await fetchSynthese(atelierId);
      setPaymentForm({ montant: '', moyen: 'ESPECES', note: '' });
      Alert.alert('Succès', 'Paiement enregistré', [{ text: 'OK' }]);
      // Refresh selected item after payment
      const updatedItems = await api.get(
        `${activeTab === 'clients' ? '/paiements/clients/recherche' : '/paiements/tailleurs/recherche'}?atelierId=${atelierId}`
      ).catch(() => null);
      if (updatedItems) {
        const arr = Array.isArray(updatedItems.data?.data || updatedItems.data)
          ? (updatedItems.data?.data || updatedItems.data) : [];
        const updatedRaw = arr.find((r) => (r.clientId || r.id) === selected.id || (r.tailleurId || r.id) === selected.id);
        if (updatedRaw) {
          const updatedItem = normalize(updatedRaw);
          setSelected(updatedItem);
          loadDetails(updatedItem);
        }
      }
      // Auto-send WhatsApp receipt
      const paiementId = res?.data?.id;
      if (paiementId) {
        try {
          const recuRes = await api.get(
            `/paiements/recu/${activeTab === 'clients' ? 'client' : 'tailleur'}/${paiementId}?atelierId=${atelierId}`
          );
          if (recuRes?.data) await sendWhatsAppReceipt(recuRes.data);
        } catch {}
      }
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible d\'enregistrer le paiement');
    } finally {
      setSaving(false);
    }
  };

  const handleSortie = async (item) => {
    const nom = `${item.prenom} ${item.nom}`.trim();
    Alert.alert(
      'Confirmer la livraison',
      `Marquer les habits de ${nom} comme récupérés ? Cela incrémentera les sorties du mois.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: '📦 Oui, livré !',
          onPress: async () => {
            try {
              setSortieLoading(true);
              const res = await api.post(`/paiements/clients/${item.id}/sortie`);
              // Update synthese counter dynamically
              if (res?.data?.nouvellesTotalSorties !== undefined) {
                setSynthese((prev) => prev ? {
                  ...prev,
                  nombreSorties: res.data.nouvellesTotalSorties,
                } : prev);
              } else {
                await fetchSynthese(atelierId);
              }
              await fetchItems(atelierId, activeTab);
              Alert.alert('📦 Livré !', res?.data?.message || 'Habits marqués comme récupérés');
            } catch (e) {
              Alert.alert('Erreur', e?.response?.data?.message || 'Impossible d\'enregistrer la sortie');
            } finally {
              setSortieLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const pct    = item.total > 0 ? Math.min(100, Math.round((item.paye / item.total) * 100)) : 0;
    const isSelected = selected?.id === item.id;
    let badgeColor = '#6b7a95'; let badgeBg = '#f0f2f5'; let badgeLabel = 'Sans commande';
    if (!item.sansCde) {
      if (item.estSolde) { badgeColor = '#198754'; badgeBg = '#eafaf1'; badgeLabel = '✓ Soldé'; }
      else { badgeColor = '#f59f00'; badgeBg = '#fff7e6'; badgeLabel = 'À régler'; }
    }

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.8}
      >
        {/* Header: nom + badge */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.prenom} {item.nom}</Text>
            {item.telephone ? <Text style={styles.sub}>📞 {item.telephone}</Text> : null}
          </View>
          <View style={[styles.badge, { borderColor: badgeColor, backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
          </View>
        </View>

        {/* Progress bar */}
        {!item.sansCde ? (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: item.estSolde ? '#198754' : '#0d6efd' }]} />
            </View>
            <Text style={styles.percentText}>{pct}% réglé</Text>
          </>
        ) : null}

        {/* Metrics */}
        {!item.sansCde ? (
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLbl}>Total dû</Text>
              <Text style={styles.metricVal}>{item.total.toLocaleString('fr-FR')} F</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLbl}>Payé</Text>
              <Text style={[styles.metricVal, { color: '#198754' }]}>{item.paye.toLocaleString('fr-FR')} F</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLbl}>Reste</Text>
              <Text style={[styles.metricVal, { color: item.reste > 0 ? '#dc3545' : '#198754' }]}>
                {item.reste.toLocaleString('fr-FR')} F
              </Text>
            </View>
          </View>
        ) : null}

        {/* Action buttons on card */}
        <View style={styles.cardActions}>
          {!item.estSolde && !item.sansCde && canCreatePaiement ? (
            <TouchableOpacity
              style={[styles.cardBtn, { backgroundColor: '#198754' }]}
              onPress={() => { handleSelect(item); }}
            >
              <Ionicons name="cash-outline" size={14} color="#fff" />
              <Text style={styles.cardBtnText}>Payer</Text>
            </TouchableOpacity>
          ) : null}

          {activeTab === 'clients' && item.estSolde && item.nbSansLivraison > 0 ? (
            <TouchableOpacity
              style={[styles.cardBtn, { backgroundColor: '#ffc107' }]}
              onPress={() => handleSortie(item)}
              disabled={sortieLoading}
            >
              <Ionicons name="cube-outline" size={14} color="#000" />
              <Text style={[styles.cardBtnText, { color: '#000' }]}>
                {sortieLoading ? '…' : 'Client a récupéré'}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.cardBtn, { borderWidth: 1, borderColor: '#0d6efd', backgroundColor: '#fff' }]}
            onPress={() => handleShowRecu(item)}
          >
            <Ionicons name="receipt-outline" size={14} color="#0d6efd" />
            <Text style={[styles.cardBtnText, { color: '#0d6efd' }]}>Reçu</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader navigation={navigation} title="Paiements" subtitle="Clients & tailleurs" showBack />

      {!canViewPaiements ? (
        <View style={styles.noPermBox}>
          <Text style={styles.noPermText}>Vous n'avez pas la permission de voir les paiements.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
          ListHeaderComponent={
            <View>
              {/* ── KPI Synthèse ── */}
              {synthese && activeTab === 'clients' ? (
                <View style={styles.kpiRow}>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiNum}>{Number(synthese.encaissementsMois || 0).toLocaleString('fr-FR')}</Text>
                    <Text style={styles.kpiLbl}>Encaissé ce mois (FCFA)</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiNum}>{synthese.nombreModeles || 0}</Text>
                    <Text style={styles.kpiLbl}>Modèles enregistrés</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <Text style={[styles.kpiNum, { color: '#f59f00' }]}>{synthese.nombreSorties || 0}</Text>
                    <Text style={styles.kpiLbl}>Sorties ce mois</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiNum}>{Number(synthese.montantModeles || 0).toLocaleString('fr-FR')}</Text>
                    <Text style={styles.kpiLbl}>Valeur totale (FCFA)</Text>
                  </View>
                </View>
              ) : null}

              {/* ── Onglets Clients / Tailleurs ── */}
              <View style={styles.tabsRow}>
                {[['clients', 'Clients'], ['tailleurs', 'Tailleurs']].map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.tabBtn, activeTab === key && styles.tabBtnActive]}
                    onPress={() => setActiveTab(key)}
                  >
                    <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Recherche ── */}
              <TextInput
                style={styles.search}
                placeholder={`Rechercher ${activeTab === 'clients' ? 'un client' : 'un tailleur'}…`}
                value={search}
                onChangeText={setSearch}
              />

              {/* ── Filtres ── */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {FILTERS.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.filterChip, filterMode === key && styles.filterChipActive]}
                    onPress={() => setFilterMode(key)}
                  >
                    <Text style={[styles.filterChipText, filterMode === key && styles.filterChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {loading ? <ActivityIndicator style={{ marginTop: 12 }} color="#0d6efd" /> : null}
            </View>
          }
          ListEmptyComponent={!loading ? (
            <Text style={styles.emptyText}>Aucun résultat trouvé.</Text>
          ) : null}
          renderItem={renderItem}
          ListFooterComponent={
            selected ? (
              <View style={{ marginTop: 4 }}>
                {/* ── Détail & historique ── */}
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>{selected.prenom} {selected.nom}</Text>

                  {/* Bilan financier */}
                  <View style={styles.bilanRow}>
                    <View style={styles.bilanCell}>
                      <Text style={styles.bilanNum}>{selected.total.toLocaleString('fr-FR')}</Text>
                      <Text style={styles.bilanLbl}>Total (FCFA)</Text>
                    </View>
                    <View style={styles.bilanCell}>
                      <Text style={[styles.bilanNum, { color: '#198754' }]}>{selected.paye.toLocaleString('fr-FR')}</Text>
                      <Text style={styles.bilanLbl}>Payé (FCFA)</Text>
                    </View>
                    <View style={styles.bilanCell}>
                      <Text style={[styles.bilanNum, { color: selected.reste > 0 ? '#dc3545' : '#198754' }]}>
                        {selected.reste.toLocaleString('fr-FR')}
                      </Text>
                      <Text style={styles.bilanLbl}>Reste (FCFA)</Text>
                    </View>
                  </View>

                  {/* Historique paiements */}
                  {(details?.historiquePaiements || details?.paiements || []).length ? (
                    <View style={styles.historyBox}>
                      <Text style={styles.historyTitle}>Historique des paiements</Text>
                      {(details?.historiquePaiements || details?.paiements || []).map((p, idx) => (
                        <View key={`pay-${idx}`} style={styles.historyRow}>
                          <View>
                            <Text style={styles.historyDate}>
                              {p.datePaiement ? new Date(p.datePaiement).toLocaleDateString('fr-FR') : '—'}
                            </Text>
                            <Text style={styles.historySub}>{p.moyen || 'ESPECES'}</Text>
                            {p.note ? <Text style={[styles.historySub, { fontStyle: 'italic' }]}>{p.note}</Text> : null}
                          </View>
                          <Text style={styles.historyAmount}>{Number(p.montant || 0).toLocaleString('fr-FR')} FCFA</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>

                {/* ── Formulaire nouveau paiement ── */}
                {canCreatePaiement && selected.reste > 0 ? (
                  <View style={styles.detailCard}>
                    <Text style={styles.sectionTitle}>Nouveau paiement</Text>

                    {/* Résumé rapide */}
                    <View style={styles.summaryBox}>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLbl}>Total dû</Text>
                        <Text style={styles.summaryVal}>{selected.total.toLocaleString('fr-FR')} F</Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLbl}>Payé</Text>
                        <Text style={[styles.summaryVal, { color: '#198754' }]}>{selected.paye.toLocaleString('fr-FR')} F</Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLbl}>Reste</Text>
                        <Text style={[styles.summaryVal, { color: '#dc3545' }]}>{selected.reste.toLocaleString('fr-FR')} F</Text>
                      </View>
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Montant (FCFA)"
                      keyboardType="numeric"
                      value={paymentForm.montant}
                      onChangeText={(v) => setPaymentForm((prev) => ({ ...prev, montant: v }))}
                    />

                    {/* Payer le solde total */}
                    <TouchableOpacity
                      style={styles.soldeBtn}
                      onPress={() => setPaymentForm((prev) => ({ ...prev, montant: String(selected.reste) }))}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#198754" />
                      <Text style={styles.soldeBtnText}>
                        Payer le solde total — {selected.reste.toLocaleString('fr-FR')} FCFA
                      </Text>
                    </TouchableOpacity>

                    <TextInput
                      style={[styles.input, { minHeight: 56 }]}
                      placeholder="Note (optionnel)"
                      value={paymentForm.note}
                      onChangeText={(v) => setPaymentForm((prev) => ({ ...prev, note: v }))}
                      multiline
                    />

                    {/* Moyen de paiement */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.methodRow}>
                      {MOYENS.map((m) => (
                        <TouchableOpacity
                          key={m.key}
                          style={[styles.methodChip, paymentForm.moyen === m.key && styles.methodChipActive]}
                          onPress={() => setPaymentForm((prev) => ({ ...prev, moyen: m.key }))}
                        >
                          <Text style={[styles.methodChipText, paymentForm.moyen === m.key && styles.methodChipTextActive]}>
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.saveBtn} onPress={handlePayment} disabled={saving}>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>
                        {saving ? 'Enregistrement…' : 'Enregistrer le paiement'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : null
          }
        />
      )}

      <BottomBar navigation={navigation} active="Paiements" />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f4f6fb' },
  noPermBox:    { margin: 16, padding: 14, backgroundColor: '#fff3f3', borderRadius: 12, borderWidth: 1, borderColor: '#ffd6d6' },
  noPermText:   { color: '#a52a2a', fontWeight: '700' },
  emptyText:    { textAlign: 'center', color: '#66758f', marginTop: 24, fontSize: 14 },

  kpiRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  kpiCard:      { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e5eaf3', alignItems: 'center' },
  kpiNum:       { fontSize: 16, fontWeight: '900', color: '#0d6efd' },
  kpiLbl:       { fontSize: 10, color: '#66758f', textAlign: 'center', marginTop: 2 },

  tabsRow:      { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tabBtn:       { flex: 1, borderWidth: 1, borderColor: '#dbe2ef', borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', paddingVertical: 10 },
  tabBtnActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  tabText:      { color: '#2b3c62', fontWeight: '800' },
  tabTextActive: { color: '#fff' },

  search:       { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe5f1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  filterRow:    { gap: 8, paddingBottom: 8 },
  filterChip:   { borderWidth: 1, borderColor: '#dbe2ef', borderRadius: 999, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7 },
  filterChipActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  filterChipText:   { color: '#2b3c62', fontWeight: '700', fontSize: 13 },
  filterChipTextActive: { color: '#fff' },

  card:         { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5eaf3', borderRadius: 12, marginBottom: 10, padding: 12 },
  cardSelected: { borderColor: '#0d6efd', backgroundColor: '#f0f6ff' },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  name:         { fontSize: 15, fontWeight: '900', color: '#1d2c4d' },
  sub:          { marginTop: 2, fontSize: 12, color: '#66758f' },
  badge:        { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, marginLeft: 8 },
  badgeText:    { fontWeight: '800', fontSize: 11 },

  progressTrack: { height: 5, backgroundColor: '#e9edf5', borderRadius: 999, overflow: 'hidden', marginBottom: 2 },
  progressFill:  { height: 5, borderRadius: 999 },
  percentText:   { fontSize: 11, color: '#64708b', fontWeight: '700', textAlign: 'right', marginBottom: 8 },

  metricsRow:   { flexDirection: 'row', gap: 4, marginBottom: 10 },
  metricItem:   { flex: 1, backgroundColor: '#f7f9fc', borderRadius: 8, padding: 6, alignItems: 'center' },
  metricLbl:    { fontSize: 10, color: '#66758f', marginBottom: 2 },
  metricVal:    { fontSize: 12, fontWeight: '800', color: '#1d2c4d' },

  cardActions:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cardBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  cardBtnText:  { color: '#fff', fontWeight: '700', fontSize: 12 },

  detailCard:   { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9edf5', borderRadius: 12, padding: 12, marginBottom: 10 },
  detailTitle:  { fontSize: 16, fontWeight: '900', color: '#1d2c4d', marginBottom: 10 },
  bilanRow:     { flexDirection: 'row', gap: 6, marginBottom: 12 },
  bilanCell:    { flex: 1, backgroundColor: '#f4f6fb', borderRadius: 8, padding: 8, alignItems: 'center' },
  bilanNum:     { fontSize: 13, fontWeight: '900', color: '#1d2c4d' },
  bilanLbl:     { fontSize: 10, color: '#66758f', textAlign: 'center', marginTop: 2 },

  historyBox:   { borderTopWidth: 1, borderTopColor: '#eef0f4', paddingTop: 10 },
  historyTitle: { fontWeight: '800', color: '#6b7a95', marginBottom: 8, fontSize: 12 },
  historyRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f2f7' },
  historyDate:  { fontWeight: '700', color: '#1d2c4d', fontSize: 13 },
  historySub:   { color: '#6b7a95', fontSize: 11, marginTop: 1 },
  historyAmount: { fontWeight: '900', color: '#1d2c4d', fontSize: 14 },

  sectionTitle: { fontWeight: '900', color: '#203155', marginBottom: 10, fontSize: 15 },
  summaryBox:   { flexDirection: 'row', gap: 6, marginBottom: 12, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#86efac' },
  summaryItem:  { flex: 1, alignItems: 'center' },
  summaryLbl:   { fontSize: 10, color: '#66758f', marginBottom: 2 },
  summaryVal:   { fontSize: 12, fontWeight: '900', color: '#1d2c4d' },

  input:        { borderWidth: 1, borderColor: '#dfe5f1', padding: 11, borderRadius: 10, marginBottom: 10, backgroundColor: '#fff', fontSize: 14 },
  soldeBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e8f4ec', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10, borderWidth: 1, borderColor: '#b2d8bc' },
  soldeBtnText: { color: '#198754', fontWeight: '800', fontSize: 13, flex: 1 },
  methodRow:    { gap: 8, paddingBottom: 10 },
  methodChip:   { borderWidth: 1, borderColor: '#dbe2ef', borderRadius: 999, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8 },
  methodChipActive: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  methodChipText:   { color: '#2b3c62', fontWeight: '700' },
  methodChipTextActive: { color: '#fff' },
  saveBtn:      { backgroundColor: '#198754', borderRadius: 12, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  saveBtnText:  { color: '#fff', fontWeight: '900', fontSize: 15 },
});
