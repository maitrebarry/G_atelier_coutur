import {execute, query} from '../database/db';

function amount(value) {
  const n = Number(String(value || '0').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export async function listTailleurs(search = '') {
  const term = `%${search.trim().toLowerCase()}%`;
  if (!search.trim()) {
    return query('SELECT * FROM tailleur WHERE actif = 1 ORDER BY date_creation DESC');
  }
  return query(
    "SELECT * FROM tailleur WHERE actif = 1 AND lower(nom || ' ' || prenom || ' ' || COALESCE(contact, '') || ' ' || COALESCE(email, '')) LIKE ? ORDER BY date_creation DESC",
    [term],
  );
}

export async function createTailleur(input) {
  const result = await execute(
    'INSERT INTO tailleur (nom, prenom, contact, email) VALUES (?, ?, ?, ?)',
    [input.nom?.trim(), input.prenom?.trim(), input.contact?.trim() || null, input.email?.trim() || null],
  );
  return result.insertId;
}

export async function addAffectation(input) {
  const result = await execute(
    `INSERT INTO affectation (id_client, id_mesure, id_tailleur, prix_tailleur, statut, date_echeance)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.id_client,
      input.id_mesure || null,
      input.id_tailleur,
      amount(input.prix_tailleur),
      input.statut || 'EN_ATTENTE',
      input.date_echeance || null,
    ],
  );
  return result.insertId;
}
