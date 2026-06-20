import {execute, query} from '../database/db';
import {createHabitMovement} from './movementService';
import {createRendezvous} from './rendezvousService';

const measureFields = [
  'sexe',
  'type_vetement',
  'habit_photo',
  'epaule',
  'manche',
  'poitrine',
  'taille',
  'longueur',
  'fesse',
  'tour_manche',
  'longueur_poitrine',
  'longueur_taille',
  'longueur_fesse',
  'longueur_jupe',
  'ceinture',
  'longueur_poitrine_robe',
  'longueur_taille_robe',
  'longueur_fesse_robe',
  'longueur_pantalon',
  'cuisse',
  'corps',
  'description',
  // price moved to modele level; remove from mesure
];

function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  // Supprime les espaces (séparateur milliers français : "50 000" → "50000")
  const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function buildAdvanceReference(idClient, idModele) {
  return `REF-CLI-AV-${idClient}-${idModele}-${Date.now().toString().slice(-6)}`;
}

function normalizeMeasure(input = {}) {
  const out = {};
  measureFields.forEach(field => {
    out[field] = [
      'sexe',
      'type_vetement',
      'description',
      'habit_photo',
    ].includes(field)
      ? input[field] || null
      : numberOrNull(input[field]);
  });
  return out;
}

export async function listClients(search = '') {
  const term = `%${search.trim().toLowerCase()}%`;
  if (!search.trim()) {
    return query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM mesure m WHERE m.id_client = c.id_client) AS mesures_count,
        (SELECT COUNT(*) FROM modele_client mo WHERE mo.id_client = c.id_client) AS modeles_count,
        (SELECT COALESCE(SUM(prix), 0) FROM modele_client mo WHERE mo.id_client = c.id_client) AS total_prix,
        (SELECT COALESCE(SUM(avance), 0) FROM modele_client mo WHERE mo.id_client = c.id_client) AS total_avance
      FROM client c
      ORDER BY c.date_creation DESC
    `);
  }
  return query(
    `
      SELECT c.*,
        (SELECT COUNT(*) FROM mesure m WHERE m.id_client = c.id_client) AS mesures_count,
        (SELECT COUNT(*) FROM modele_client mo WHERE mo.id_client = c.id_client) AS modeles_count,
        (SELECT COALESCE(SUM(prix), 0) FROM modele_client mo WHERE mo.id_client = c.id_client) AS total_prix,
        (SELECT COALESCE(SUM(avance), 0) FROM modele_client mo WHERE mo.id_client = c.id_client) AS total_avance
      FROM client c
      WHERE lower(c.nom || ' ' || c.prenom || ' ' || c.contact || ' ' || COALESCE(c.adresse, '')) LIKE ?
      ORDER BY c.date_creation DESC
    `,
    [term],
  );
}

export async function getClientDetails(idClient) {
  const clients = await query('SELECT * FROM client WHERE id_client = ?', [idClient]);
  const client = clients[0];
  if (!client) return null;
  const mesures = await query('SELECT * FROM mesure WHERE id_client = ? ORDER BY date_mesure DESC', [idClient]);
  const modeles = await query('SELECT * FROM modele_client WHERE id_client = ? ORDER BY date_creation DESC', [idClient]);
  const mouvements = await query('SELECT * FROM mouvement_habit WHERE id_client = ? ORDER BY date_mouvement DESC', [idClient]);
  const paiements = await query("SELECT montant FROM paiement WHERE id_client = ? AND type_paiement = 'CLIENT'", [idClient]);
  return {...client, mesures, modeles, mouvements, paiements};
}

export async function createClientWithMeasureAndModel(payload) {
  const clientResult = await execute(
    'INSERT INTO client (nom, prenom, contact, adresse, email, photo) VALUES (?, ?, ?, ?, ?, ?)',
    [
      payload.nom?.trim(),
      payload.prenom?.trim(),
      payload.contact?.trim(),
      payload.adresse?.trim() || null,
      payload.email?.trim() || null,
      payload.photo || null,
    ],
  );
  const idClient = clientResult.insertId;
  const mesure = normalizeMeasure(payload.mesure);
  const placeholders = measureFields.map(() => '?').join(', ');
  const mesureResult = await execute(
    `INSERT INTO mesure (id_client, ${measureFields.join(', ')}) VALUES (?, ${placeholders})`,
    [idClient, ...measureFields.map(field => mesure[field])],
  );
  const idMesure = mesureResult.insertId;

  let entreeReference = null;
  if (payload.modele?.nom_modele) {
    const avance = numberOrNull(payload.modele.avance) || 0;
    const modeleResult = await execute(
      `INSERT INTO modele_client
        (id_client, id_mesure, photo, nom_modele, description, message_ia, prix, avance, statut, categorie)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idClient,
        idMesure,
        payload.modele.photo || null,
        payload.modele.nom_modele,
        payload.modele.description || mesure.description,
        payload.modele.message_ia || null,
        numberOrNull(payload.modele.prix) || 0,
        avance,
        payload.modele.statut || 'EN_ATTENTE',
        payload.modele.categorie || mesure.type_vetement || null,
      ],
    );
    if (avance > 0) {
      await execute(
        `INSERT INTO paiement
          (id_client, id_modele, id_mesure, montant, moyen, reference, date_paiement, type_paiement, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'CLIENT', ?)`,
        [
          idClient,
          modeleResult.insertId,
          idMesure,
          avance,
          payload.modele.moyen || 'ESPECES',
          buildAdvanceReference(idClient, modeleResult.insertId),
          new Date().toISOString(),
          'AVANCE_INITIALE',
        ],
      );
    }
    const movement = await createHabitMovement({
      type_mouvement: 'ENTREE',
      id_client: idClient,
      id_mesure: idMesure,
      id_modele: modeleResult.insertId,
      notes: `Mesure prise - ${payload.modele.nom_modele}`,
    });
    entreeReference = movement.reference;
    
    try {
      const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await createRendezvous({
        id_client: idClient,
        id_mesure: idMesure,
        date_rdv: d.toISOString(),
        type_rendezvous: 'LIVRAISON',
        notes: 'Rendez-vous généré automatiquement.',
      });
    } catch (e) {
      console.error('Erreur génération RDV auto:', e);
    }
  }
  const details = await getClientDetails(idClient);
  return {...details, entreeReference};
}

export async function updateClient(idClient, payload) {
  await execute(
    'UPDATE client SET nom = ?, prenom = ?, contact = ?, adresse = ?, email = ?, photo = ? WHERE id_client = ?',
    [
      payload.nom?.trim(),
      payload.prenom?.trim(),
      payload.contact?.trim(),
      payload.adresse?.trim() || null,
      payload.email?.trim() || null,
      payload.photo || null,
      idClient,
    ],
  );
  return getClientDetails(idClient);
}

export async function deleteClient(idClient) {
  await execute('DELETE FROM client WHERE id_client = ?', [idClient]);
}

export async function addMeasure(idClient, input) {
  const mesure = normalizeMeasure(input);
  const placeholders = measureFields.map(() => '?').join(', ');
  const result = await execute(
    `INSERT INTO mesure (id_client, ${measureFields.join(', ')}) VALUES (?, ${placeholders})`,
    [idClient, ...measureFields.map(field => mesure[field])],
  );
  return result.insertId;
}

export async function updateMeasure(idMesure, input) {
  const mesure = normalizeMeasure(input);
  await execute(
    `UPDATE mesure SET ${measureFields.map(field => `${field} = ?`).join(', ')} WHERE id_mesure = ?`,
    [...measureFields.map(field => mesure[field]), idMesure],
  );
}
