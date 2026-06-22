import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_KEY = 'ateliko_offline_store_v1';

const emptyStore = () => ({
  clients: [],
  modeles: [],
  paiements: [],
  rendezvous: [],
});

const nowIso = () => new Date().toISOString();

const uuid = (prefix = 'local') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const asNumber = (value, fallback = 0) => {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};

const formEntries = (data) => {
  if (!data) return [];
  if (Array.isArray(data?._parts)) return data._parts;
  if (Array.isArray(data?.parts)) return data.parts;
  if (typeof data === 'object') return Object.entries(data);
  return [];
};

const formValue = (data, key) => {
  const entry = formEntries(data).find(([name]) => name === key);
  return entry ? entry[1] : undefined;
};

const formJson = (data, key) => {
  const value = formValue(data, key);
  if (!value) return null;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

const fileUri = (data, key) => {
  const value = formValue(data, key);
  return value?.uri || null;
};

const withStore = async (mutator) => {
  const raw = await AsyncStorage.getItem(STORE_KEY);
  const store = raw ? { ...emptyStore(), ...JSON.parse(raw) } : emptyStore();
  const result = await mutator(store);
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
  return result;
};

const readStore = async () => {
  const raw = await AsyncStorage.getItem(STORE_KEY);
  return raw ? { ...emptyStore(), ...JSON.parse(raw) } : emptyStore();
};

const getUser = async () => {
  const raw = await AsyncStorage.getItem('userData');
  return raw ? JSON.parse(raw) : null;
};

const currentAtelierId = async () => {
  const user = await getUser();
  return user?.atelierId || user?.atelier?.id || 'offline-atelier';
};

const atelierInfo = async (atelierId) => {
  const user = await getUser();
  const atelier = user?.atelier || {};
  return {
    id: atelierId,
    nom: atelier.nom || user?.atelierNom || 'Atelier',
    adresse: atelier.adresse || '',
    telephone: atelier.telephone || atelier.contact || '',
  };
};

const clientTotal = (client) =>
  (client?.mesures || []).reduce((sum, mesure) => sum + asNumber(mesure.prix), 0);

const clientPayments = (store, clientId, atelierId) =>
  store.paiements.filter(
    (p) => p.typePaiement === 'CLIENT' && String(p.clientId) === String(clientId) && String(p.atelierId) === String(atelierId)
  );

const paymentSummary = (store, client, atelierId) => {
  const total = clientTotal(client);
  const paye = clientPayments(store, client.id, atelierId).reduce((sum, p) => sum + asNumber(p.montant), 0);
  const reste = Math.max(0, total - paye);
  return {
    clientId: client.id,
    clientNom: client.nom || '',
    clientPrenom: client.prenom || '',
    clientTelephone: client.contact || '',
    modeleNom: client.mesures?.[0]?.modeleNom || client.mesures?.[0]?.typeVetement || 'Modèle personnalisé',
    prixTotal: total,
    nombreModeles: client.mesures?.length || 0,
    montantPaye: paye,
    resteAPayer: reste,
    statutPaiement: paye <= 0 ? 'EN_ATTENTE' : reste > 0 ? 'PARTIEL' : 'PAYE',
    historiquePaiements: clientPayments(store, client.id, atelierId).map((p) => ({
      id: p.id,
      montant: p.montant,
      moyen: p.moyen,
      reference: p.reference,
      datePaiement: p.datePaiement,
    })),
    affectations: [],
  };
};

const getTypeVetement = (fields) => {
  if (String(fields.sexe || '').toLowerCase() === 'homme') return 'homme';
  return String(fields.femme_type || fields.typeVetement || 'robe').toLowerCase();
};

const buildMesure = (fields, store) => {
  const modele = fields.selectedModelId
    ? store.modeles.find((m) => String(m.id) === String(fields.selectedModelId))
    : null;
  const typeVetement = getTypeVetement(fields);
  return {
    id: uuid('mesure'),
    dateMesure: nowIso(),
    sexe: fields.sexe || 'Femme',
    typeVetement,
    prix: asNumber(fields.prix, asNumber(modele?.prix, 0)),
    description: fields.description || modele?.description || '',
    modeleReferenceId: modele?.id || fields.selectedModelId || null,
    modeleNom: fields.modeleNom || modele?.nom || '',
    photoPath: fileUri(fields._formData, 'photo') || modele?.photoPath || null,
    habitPhotoPath: fileUri(fields._formData, 'habitPhoto') || null,
    epaule: asNumber(fields[`${typeVetement}_epaule`]),
    manche: asNumber(fields[`${typeVetement}_manche`]),
    poitrine: asNumber(fields[`${typeVetement}_poitrine`]),
    taille: asNumber(fields[`${typeVetement}_taille`] || fields.homme_ceinture),
    longueur: asNumber(fields[`${typeVetement}_longueur`]),
    fesse: asNumber(fields[`${typeVetement}_fesse`]),
    tourManche: asNumber(fields[`${typeVetement}_tour_manche`]),
    longueurPoitrine: asNumber(fields[`${typeVetement}_longueur_poitrine`]),
    longueurTaille: asNumber(fields[`${typeVetement}_longueur_taille`]),
    longueurFesse: asNumber(fields[`${typeVetement}_longueur_fesse`]),
    longueurJupe: asNumber(fields.jupe_longueur_jupe),
    ceinture: asNumber(fields.jupe_ceinture || fields.homme_ceinture),
    longueurPantalon: asNumber(fields.homme_longueur_pantalon),
    cuisse: asNumber(fields.homme_cuisse),
    corps: asNumber(fields.homme_corps),
  };
};

const makeAutoRendezVous = (client, mesure, atelierId) => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(10, 0, 0, 0);
  return {
    id: uuid('rdv'),
    client,
    clientId: client.id,
    atelierId,
    mesure,
    mesureId: mesure?.id || null,
    dateRDV: date.toISOString(),
    typeRendezVous: "LIVRAISON DE L'HABIT",
    notes: "Rendez-vous automatique pour la récupération de l'habit déjà cousu.",
    statut: 'PLANIFIE',
    createdAt: nowIso(),
  };
};

const makeReceipt = async (store, paiement, atelierId) => {
  const client = store.clients.find((c) => String(c.id) === String(paiement.clientId));
  const atelier = await atelierInfo(atelierId);
  const totalDu = client ? clientTotal(client) : 0;
  const totalPaye = client ? clientPayments(store, client.id, atelierId).reduce((sum, p) => sum + asNumber(p.montant), 0) : 0;
  const prochainRendezVous = store.rendezvous
    .filter((rdv) => String(rdv.clientId) === String(paiement.clientId) && new Date(rdv.dateRDV) > new Date())
    .sort((a, b) => new Date(a.dateRDV) - new Date(b.dateRDV))[0];

  return {
    id: paiement.id,
    typePaiement: 'CLIENT',
    reference: paiement.reference,
    datePaiement: paiement.datePaiement,
    montant: paiement.montant,
    moyenPaiement: paiement.moyen,
    clientNom: client?.nom || '',
    clientPrenom: client?.prenom || '',
    clientContact: client?.contact || '',
    statut: 'Reçu client',
    totalDu,
    resteAPayer: Math.max(0, totalDu - totalPaye),
    atelierNom: atelier.nom,
    atelierAdresse: atelier.adresse,
    atelierTelephone: atelier.telephone,
    prochainRendezVous: prochainRendezVous?.dateRDV || null,
  };
};

export const isOfflineForced = () =>
  String(process.env.EXPO_PUBLIC_OFFLINE || process.env.EXPO_OFFLINE || '').toLowerCase() === '1';

export const cacheOnlineResponse = async (method, url, payload) => {
  if (method !== 'get') return;
  const cleanUrl = String(url || '').replace(/^\/api/, '');

  if (/^\/clients\/modeles\/atelier\/[^/]+/.test(cleanUrl) || /^\/modeles\/atelier\/[^/]+/.test(cleanUrl)) {
    const atelierIdFromUrl = cleanUrl.split('/').pop();
    await withStore(async (store) => {
      const list = Array.isArray(payload) ? payload : [];
      const byId = new Map(store.modeles.map((m) => [String(m.id), m]));
      list.forEach((m) => byId.set(String(m.id), { ...m, atelierId: m.atelierId || atelierIdFromUrl }));
      store.modeles = Array.from(byId.values());
    });
    return;
  }

  if (cleanUrl === '/clients' && Array.isArray(payload)) {
    const atelierId = await currentAtelierId();
    await withStore(async (store) => {
      const byId = new Map(store.clients.map((c) => [String(c.id), c]));
      payload.forEach((c) => byId.set(String(c.id), { ...c, atelierId: c.atelierId || c.atelier?.id || atelierId }));
      store.clients = Array.from(byId.values());
    });
    return;
  }

  if (/^\/clients\/[^/]+$/.test(cleanUrl) && payload?.id) {
    const atelierId = await currentAtelierId();
    await withStore(async (store) => {
      const index = store.clients.findIndex((c) => String(c.id) === String(payload.id));
      const client = { ...payload, atelierId: payload.atelierId || payload.atelier?.id || atelierId };
      if (index >= 0) store.clients[index] = client;
      else store.clients.unshift(client);
    });
  }
};

export const offlineHandle = async (method, url, data) => {
  const cleanUrl = String(url || '').replace(/^\/api/, '');
  const atelierId = await currentAtelierId();

  if (method === 'get' && /^\/clients\/modeles\/atelier\/[^/]+/.test(cleanUrl)) {
    const store = await readStore();
    return store.modeles.filter((m) => String(m.atelierId) === String(cleanUrl.split('/').pop()));
  }

  if (method === 'get' && /^\/modeles\/atelier\/[^/]+/.test(cleanUrl)) {
    const store = await readStore();
    return store.modeles.filter((m) => String(m.atelierId) === String(cleanUrl.split('/')[3]));
  }

  if (method === 'post' && cleanUrl === '/modeles') {
    return withStore(async (store) => {
      const payload = formJson(data, 'modele') || {};
      const modele = {
        id: uuid('modele'),
        atelierId: payload.atelierId || atelierId,
        nom: payload.nom || 'Modèle',
        categorie: payload.categorie || 'AUTRE',
        prix: asNumber(payload.prix),
        description: payload.description || '',
        photoPath: fileUri(data, 'photo') || payload.photoPath || null,
        videoPath: fileUri(data, 'video') || payload.videoPath || null,
        createdAt: nowIso(),
      };
      store.modeles.unshift(modele);
      return modele;
    });
  }

  if (method === 'put' && /^\/modeles\/[^/]+\/atelier\/[^/]+/.test(cleanUrl)) {
    return withStore(async (store) => {
      const id = cleanUrl.split('/')[2];
      const payload = formJson(data, 'modele') || {};
      const index = store.modeles.findIndex((m) => String(m.id) === String(id));
      if (index < 0) throw new Error('Album introuvable hors connexion');
      store.modeles[index] = {
        ...store.modeles[index],
        ...payload,
        prix: asNumber(payload.prix, store.modeles[index].prix),
        photoPath: fileUri(data, 'photo') || payload.photoPath || store.modeles[index].photoPath,
        videoPath: fileUri(data, 'video') || payload.videoPath || store.modeles[index].videoPath,
        updatedAt: nowIso(),
      };
      return store.modeles[index];
    });
  }

  if (method === 'delete' && /^\/modeles\/[^/]+\/atelier\/[^/]+/.test(cleanUrl)) {
    return withStore(async (store) => {
      const id = cleanUrl.split('/')[2];
      store.modeles = store.modeles.filter((m) => String(m.id) !== String(id));
      return { status: 'success' };
    });
  }

  if (method === 'get' && cleanUrl === '/clients') {
    const store = await readStore();
    return store.clients.filter((c) => String(c.atelierId || atelierId) === String(atelierId));
  }

  if (method === 'get' && /^\/clients\/[^/]+$/.test(cleanUrl)) {
    const store = await readStore();
    const id = cleanUrl.split('/')[2];
    const client = store.clients.find((c) => String(c.id) === String(id));
    if (!client) throw new Error('Client introuvable hors connexion');
    return client;
  }

  if (method === 'post' && cleanUrl === '/clients/ajouter') {
    return withStore(async (store) => {
      const fields = Object.fromEntries(formEntries(data).filter(([, value]) => typeof value !== 'object'));
      fields._formData = data;
      const mesure = buildMesure(fields, store);
      const client = {
        id: uuid('client'),
        atelierId,
        nom: fields.nom || '',
        prenom: fields.prenom || '',
        contact: fields.contact || '',
        adresse: fields.adresse || '',
        email: fields.email || '',
        mesures: [mesure],
        createdAt: nowIso(),
      };
      mesure.client = undefined;
      store.clients.unshift(client);
      store.rendezvous.unshift(makeAutoRendezVous(client, mesure, atelierId));
      return {
        status: 'success',
        message: `Client '${client.nom}' enregistré avec succès !`,
        clientId: client.id,
        rendezVousAuto: true,
      };
    });
  }

  if (method === 'put' && /^\/clients\/[^/]+$/.test(cleanUrl)) {
    return withStore(async (store) => {
      const id = cleanUrl.split('/')[2];
      const index = store.clients.findIndex((c) => String(c.id) === String(id));
      if (index < 0) throw new Error('Client introuvable hors connexion');
      const fields = Object.fromEntries(formEntries(data).filter(([, value]) => typeof value !== 'object'));
      fields._formData = data;
      const existing = store.clients[index];
      const mesure = { ...(existing.mesures?.[0] || {}), ...buildMesure(fields, store), id: existing.mesures?.[0]?.id || uuid('mesure') };
      store.clients[index] = {
        ...existing,
        nom: fields.nom || existing.nom,
        prenom: fields.prenom || existing.prenom,
        contact: fields.contact || existing.contact,
        adresse: fields.adresse || existing.adresse,
        email: fields.email || existing.email,
        mesures: [mesure],
        updatedAt: nowIso(),
      };
      return store.clients[index];
    });
  }

  if (method === 'delete' && /^\/clients\/[^/]+$/.test(cleanUrl)) {
    return withStore(async (store) => {
      const id = cleanUrl.split('/')[2];
      store.clients = store.clients.filter((c) => String(c.id) !== String(id));
      store.paiements = store.paiements.filter((p) => String(p.clientId) !== String(id));
      store.rendezvous = store.rendezvous.filter((r) => String(r.clientId) !== String(id));
      return { status: 'success' };
    });
  }

  if (method === 'get' && cleanUrl.startsWith('/paiements/clients/recherche')) {
    const store = await readStore();
    const params = new URLSearchParams(cleanUrl.split('?')[1] || '');
    const at = params.get('atelierId') || atelierId;
    const search = (params.get('searchTerm') || '').toLowerCase();
    const statut = params.get('statutPaiement') || '';
    return store.clients
      .filter((c) => String(c.atelierId || at) === String(at))
      .map((c) => paymentSummary(store, c, at))
      .filter((s) => !search || `${s.clientPrenom} ${s.clientNom} ${s.clientTelephone}`.toLowerCase().includes(search))
      .filter((s) => !statut || s.statutPaiement === statut);
  }

  if (method === 'get' && /^\/paiements\/clients\/[^?]+/.test(cleanUrl)) {
    const store = await readStore();
    const id = cleanUrl.split('/')[3].split('?')[0];
    const params = new URLSearchParams(cleanUrl.split('?')[1] || '');
    const at = params.get('atelierId') || atelierId;
    const client = store.clients.find((c) => String(c.id) === String(id));
    if (!client) throw new Error('Client introuvable hors connexion');
    return paymentSummary(store, client, at);
  }

  if (method === 'post' && cleanUrl === '/paiements/clients') {
    return withStore(async (store) => {
      const paiement = {
        id: uuid('paiement'),
        typePaiement: 'CLIENT',
        clientId: data.clientId,
        atelierId: data.atelierId || atelierId,
        montant: asNumber(data.montant),
        moyen: data.moyen || 'ESPECES',
        reference: data.reference || `REF-CLI-${Date.now().toString().slice(-6)}`,
        datePaiement: data.datePaiement || nowIso(),
      };
      store.paiements.unshift(paiement);
      return paiement;
    });
  }

  if (method === 'get' && /^\/paiements\/recu\/client\/[^?]+/.test(cleanUrl) && !cleanUrl.startsWith('/paiements/recu/client/due/')) {
    const store = await readStore();
    const id = cleanUrl.split('/')[4].split('?')[0];
    const params = new URLSearchParams(cleanUrl.split('?')[1] || '');
    const at = params.get('atelierId') || atelierId;
    const paiement = store.paiements.find((p) => String(p.id) === String(id));
    if (!paiement) throw new Error('Paiement introuvable hors connexion');
    return makeReceipt(store, paiement, at);
  }

  if (method === 'get' && /^\/paiements\/recu\/client\/due\/[^?]+/.test(cleanUrl)) {
    const store = await readStore();
    const id = cleanUrl.split('/')[5].split('?')[0];
    const params = new URLSearchParams(cleanUrl.split('?')[1] || '');
    const at = params.get('atelierId') || atelierId;
    const client = store.clients.find((c) => String(c.id) === String(id));
    if (!client) throw new Error('Client introuvable hors connexion');
    const syntheticPaiement = {
      id: client.id,
      clientId: client.id,
      atelierId: at,
      reference: `DU-${String(client.id).slice(0, 8).toUpperCase()}`,
      datePaiement: nowIso(),
      montant: 0,
      moyen: 'AUCUN',
    };
    const recu = await makeReceipt(store, syntheticPaiement, at);
    return { ...recu, statut: 'Solde dû' };
  }

  if (method === 'get' && /^\/rendezvous\/atelier\/[^/]+\/a-venir/.test(cleanUrl)) {
    const store = await readStore();
    const at = cleanUrl.split('/')[3];
    return store.rendezvous
      .filter((r) => String(r.atelierId) === String(at) && new Date(r.dateRDV) >= new Date())
      .map((r) => ({
        id: r.id,
        dateRDV: r.dateRDV,
        typeRendezVous: r.typeRendezVous,
        statut: r.statut,
        clientNomComplet: `${r.client?.prenom || ''} ${r.client?.nom || ''}`.trim(),
        clientContact: r.client?.contact || '',
        mesureId: r.mesureId,
        mesureLibelle: r.mesure?.modeleNom || r.mesure?.typeVetement || 'Vêtement',
      }));
  }

  if (method === 'get' && /^\/rendezvous\/atelier\/[^/]+\/clients/.test(cleanUrl)) {
    const store = await readStore();
    const at = cleanUrl.split('/')[3];
    return store.clients.filter((c) => String(c.atelierId) === String(at));
  }

  if (method === 'get' && /^\/rendezvous\/clients\/[^/]+\/details/.test(cleanUrl)) {
    const store = await readStore();
    const id = cleanUrl.split('/')[3];
    const client = store.clients.find((c) => String(c.id) === String(id));
    if (!client) throw new Error('Client introuvable hors connexion');
    return client;
  }

  if (method === 'post' && cleanUrl === '/rendezvous') {
    return withStore(async (store) => {
      const client = store.clients.find((c) => String(c.id) === String(data.clientId));
      const mesure = client?.mesures?.find((m) => String(m.id) === String(data.mesureId)) || null;
      const rdv = {
        id: uuid('rdv'),
        ...data,
        client,
        mesure,
        statut: 'PLANIFIE',
        createdAt: nowIso(),
      };
      store.rendezvous.unshift(rdv);
      return rdv;
    });
  }

  throw new Error(`Endpoint indisponible hors connexion: ${method.toUpperCase()} ${cleanUrl}`);
};
