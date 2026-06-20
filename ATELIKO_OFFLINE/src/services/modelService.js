import {execute, query} from '../database/db';
import {createHabitMovement} from './movementService';

function money(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const n = Number(String(value).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export async function listModeles(search = '') {
  const text = search.trim().toLowerCase();
  if (!text) {
    return query(`
      SELECT m.*, c.nom, c.prenom, c.contact
      FROM modele_client m
      JOIN client c ON c.id_client = m.id_client
      ORDER BY m.date_creation DESC
    `);
  }
  return query(
    `
      SELECT m.*, c.nom, c.prenom, c.contact
      FROM modele_client m
      JOIN client c ON c.id_client = m.id_client
      WHERE lower(m.nom_modele || ' ' || COALESCE(m.description, '') || ' ' || COALESCE(m.statut, '') || ' ' || c.nom || ' ' || c.prenom) LIKE ?
      ORDER BY m.date_creation DESC
    `,
    [`%${text}%`],
  );
}

export async function createModele(input) {
  const result = await execute(
    `INSERT INTO modele_client
      (id_client, id_mesure, photo, nom_modele, description, message_ia, prix, avance, statut, categorie)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id_client,
      input.id_mesure || null,
      input.photo || null,
      input.nom_modele?.trim(),
      input.description?.trim() || null,
      input.message_ia?.trim() || null,
      money(input.prix),
      money(input.avance),
      input.statut || 'EN_ATTENTE',
      input.categorie || null,
    ],
  );
  const movement = await createHabitMovement({
    type_mouvement: 'ENTREE',
    id_client: input.id_client,
    id_mesure: input.id_mesure || null,
    id_modele: result.insertId,
    notes: `Modele ajoute - ${input.nom_modele}`,
  });
  return {id_modele: result.insertId, entreeReference: movement.reference};
}

export async function updateModele(idModele, input) {
  await execute(
    `UPDATE modele_client
     SET photo = ?, nom_modele = ?, description = ?, message_ia = ?, prix = ?, avance = ?, statut = ?, categorie = ?, date_modification = CURRENT_TIMESTAMP
     WHERE id_modele = ?`,
    [
      input.photo || null,
      input.nom_modele?.trim(),
      input.description?.trim() || null,
      input.message_ia?.trim() || null,
      money(input.prix),
      money(input.avance),
      input.statut || 'EN_ATTENTE',
      input.categorie || null,
      idModele,
    ],
  );
}

export async function deleteModele(idModele) {
  await execute('DELETE FROM modele_client WHERE id_modele = ?', [idModele]);
}

export async function listClientMeasureChoices(idClient) {
  return query('SELECT id_mesure, date_mesure, type_vetement, prix FROM mesure WHERE id_client = ? ORDER BY date_mesure DESC', [idClient]);
}

export async function listAlbums(search = '') {
  const text = search.trim().toLowerCase();
  if (!text) {
    return query(`
      SELECT * FROM album
      ORDER BY date_creation DESC
    `);
  }
  return query(
    `
      SELECT * FROM album
      WHERE lower(nom_modele || ' ' || COALESCE(description, '')) LIKE ?
      ORDER BY date_creation DESC
    `,
    [`%${text}%`],
  );
}

export async function createAlbum(input) {
  const result = await execute(
    `INSERT INTO album
      (photo, nom_modele, description, prix, categorie)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.photo || null,
      input.nom_modele?.trim(),
      input.description?.trim() || null,
      money(input.prix),
      input.categorie || null,
    ],
  );
  return {id_album: result.insertId};
}

export async function updateAlbum(idAlbum, input) {
  await execute(
    `UPDATE album
     SET photo = ?, nom_modele = ?, description = ?, prix = ?, categorie = ?
     WHERE id_album = ?`,
    [
      input.photo || null,
      input.nom_modele?.trim(),
      input.description?.trim() || null,
      money(input.prix),
      input.categorie || null,
      idAlbum,
    ],
  );
}

export async function deleteAlbum(idAlbum) {
  await execute('DELETE FROM album WHERE id_album = ?', [idAlbum]);
}
