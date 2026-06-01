import {execute, query} from '../database/db';
import {createHabitMovement} from './movementService';

export async function listRendezvous(search = '') {
  const term = `%${search.trim().toLowerCase()}%`;
  if (!search.trim()) {
    return query(`
      SELECT r.*, c.nom, c.prenom, c.contact, m.type_vetement
      FROM rendezvous r
      JOIN client c ON c.id_client = r.id_client
      LEFT JOIN mesure m ON m.id_mesure = r.id_mesure
      ORDER BY r.date_rdv ASC
    `);
  }
  return query(
    `
      SELECT r.*, c.nom, c.prenom, c.contact, m.type_vetement
      FROM rendezvous r
      JOIN client c ON c.id_client = r.id_client
      LEFT JOIN mesure m ON m.id_mesure = r.id_mesure
      WHERE lower(c.nom || ' ' || c.prenom || ' ' || c.contact || ' ' || r.type_rendezvous || ' ' || COALESCE(r.notes, '')) LIKE ?
      ORDER BY r.date_rdv ASC
    `,
    [term],
  );
}

export async function listClientsForRendezvous() {
  return query('SELECT id_client, nom, prenom, contact FROM client ORDER BY prenom, nom');
}

export async function createRendezvous(input) {
  if (!input.id_client) throw new Error('Client obligatoire');
  if (!input.date_rdv) throw new Error('Date obligatoire');
  const date = new Date(input.date_rdv);
  if (Number.isNaN(date.getTime())) throw new Error('Date invalide');
  if (date.getTime() < Date.now() - 60000) throw new Error('La date doit etre dans le present ou le futur');

  const conflict = await query(
    "SELECT id_rendezvous FROM rendezvous WHERE date_rdv = ? AND statut NOT IN ('ANNULE') AND id_client <> ?",
    [input.date_rdv, input.id_client],
  );
  if (conflict.length) throw new Error('Un rendez-vous existe deja a cette date et heure');

  const result = await execute(
    `INSERT INTO rendezvous (id_client, id_mesure, date_rdv, type_rendezvous, notes, statut)
     VALUES (?, ?, ?, ?, ?, 'PLANIFIE')`,
    [
      input.id_client,
      input.id_mesure || null,
      input.date_rdv,
      input.type_rendezvous || 'LIVRAISON',
      input.notes?.trim() || null,
    ],
  );
  return result.insertId;
}

export async function updateRendezvous(idRendezvous, input) {
  if (!input.date_rdv) throw new Error('Date obligatoire');
  const date = new Date(input.date_rdv);
  if (Number.isNaN(date.getTime())) throw new Error('Date invalide');

  const result = await execute(
    `UPDATE rendezvous 
     SET date_rdv = ?, type_rendezvous = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id_rendezvous = ?`,
    [
      input.date_rdv,
      input.type_rendezvous || 'LIVRAISON',
      input.notes?.trim() || null,
      idRendezvous,
    ],
  );
  return result;
}

export async function updateRendezvousStatus(idRendezvous, statut) {
  await execute('UPDATE rendezvous SET statut = ?, updated_at = CURRENT_TIMESTAMP WHERE id_rendezvous = ?', [statut, idRendezvous]);
  if (statut !== 'TERMINE') return null;
  const rows = await query('SELECT * FROM rendezvous WHERE id_rendezvous = ?', [idRendezvous]);
  const rdv = rows[0];
  if (!rdv) return null;
  const type = String(rdv.type_rendezvous || '').toUpperCase();
  if (!type.includes('LIVRAISON')) return null;
  return createHabitMovement({
    type_mouvement: 'SORTIE',
    id_client: rdv.id_client,
    id_mesure: rdv.id_mesure || null,
    id_rendezvous: idRendezvous,
    notes: rdv.notes || 'Habit livre au client',
  });
}

export async function deleteRendezvous(idRendezvous) {
  await execute('DELETE FROM rendezvous WHERE id_rendezvous = ?', [idRendezvous]);
}
