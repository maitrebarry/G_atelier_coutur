import {execute, query} from '../database/db';
import {createHabitMovement} from './movementService';

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
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
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
        COUNT(DISTINCT m.id_mesure) AS mesures_count,
        COUNT(DISTINCT mo.id_modele) AS modeles_count,
        COALESCE(SUM(mo.prix), 0) AS total_prix,
        COALESCE(SUM(mo.avance), 0) AS total_avance
      FROM client c
      LEFT JOIN mesure m ON m.id_client = c.id_client
      LEFT JOIN modele_client mo ON mo.id_client = c.id_client
      GROUP BY c.id_client
      ORDER BY c.date_creation DESC
    `);
  }
  return query(
    `
      SELECT c.*,
        COUNT(DISTINCT m.id_mesure) AS mesures_count,
        COUNT(DISTINCT mo.id_modele) AS modeles_count,
        COALESCE(SUM(mo.prix), 0) AS total_prix,
        COALESCE(SUM(mo.avance), 0) AS total_avance
      FROM client c
      LEFT JOIN mesure m ON m.id_client = c.id_client
      LEFT JOIN modele_client mo ON mo.id_client = c.id_client
      WHERE lower(c.nom || ' ' || c.prenom || ' ' || c.contact || ' ' || COALESCE(c.adresse, '')) LIKE ?
      GROUP BY c.id_client
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
  return {...client, mesures, modeles, mouvements};
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
        numberOrNull(payload.modele.avance) || 0,
        payload.modele.statut || 'EN_ATTENTE',
        payload.modele.categorie || mesure.type_vetement || null,
      ],
    );
    const movement = await createHabitMovement({
      type_mouvement: 'ENTREE',
      id_client: idClient,
      id_mesure: idMesure,
      id_modele: modeleResult.insertId,
      notes: `Mesure prise - ${payload.modele.nom_modele}`,
    });
    entreeReference = movement.reference;
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
