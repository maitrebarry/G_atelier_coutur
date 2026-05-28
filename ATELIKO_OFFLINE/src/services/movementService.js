import {execute, query} from '../database/db';

export function buildMovementReference(type = 'ENTREE') {
  return `${type === 'SORTIE' ? 'SOR' : 'ENT'}-${Date.now().toString().slice(-8)}`;
}

export async function createHabitMovement(input) {
  const reference = input.reference || buildMovementReference(input.type_mouvement);
  const result = await execute(
    `INSERT INTO mouvement_habit
      (type_mouvement, id_client, id_mesure, id_modele, id_rendezvous, quantite, reference, notes, date_mouvement)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.type_mouvement,
      input.id_client,
      input.id_mesure || null,
      input.id_modele || null,
      input.id_rendezvous || null,
      input.quantite || 1,
      reference,
      input.notes || null,
      input.date_mouvement || new Date().toISOString(),
    ],
  );
  return {...input, id_mouvement: result.insertId, reference};
}

export async function findMovementByReference(reference) {
  const rows = await query(
    `SELECT mv.*, c.nom, c.prenom, c.contact, mo.nom_modele, mo.prix, m.type_vetement
     FROM mouvement_habit mv
     JOIN client c ON c.id_client = mv.id_client
     LEFT JOIN modele_client mo ON mo.id_modele = mv.id_modele
     LEFT JOIN mesure m ON m.id_mesure = mv.id_mesure
     WHERE mv.reference = ?`,
    [reference],
  );
  return rows[0] || null;
}
