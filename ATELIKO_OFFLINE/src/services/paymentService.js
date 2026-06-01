import {execute, query} from '../database/db';
import {createHabitMovement} from './movementService';

function amount(value) {
  const n = Number(String(value || '0').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function paymentStatus(total, paid) {
  if (paid <= 0) return 'EN_ATTENTE';
  if (paid >= total && total > 0) return 'PAYE';
  return 'PARTIEL';
}

async function getModeleById(idModele) {
  if (!idModele) return null;
  const rows = await query('SELECT * FROM modele_client WHERE id_modele = ?', [idModele]);
  return rows[0] || null;
}

async function getModelePaymentsTotal(idModele, excludePaiementId = null) {
  if (!idModele) return 0;
  const sql = excludePaiementId
    ? 'SELECT COALESCE(SUM(montant), 0) AS total FROM paiement WHERE id_modele = ? AND id_paiement <> ?'
    : 'SELECT COALESCE(SUM(montant), 0) AS total FROM paiement WHERE id_modele = ?';
  const params = excludePaiementId ? [idModele, excludePaiementId] : [idModele];
  const rows = await query(sql, params);
  return amount(rows[0]?.total);
}

async function getModeleAdvanceFallback(idModele) {
  if (!idModele) return 0;
  const rows = await query(
    `SELECT
       mo.avance,
       EXISTS(
         SELECT 1 FROM paiement p
         WHERE p.id_modele = mo.id_modele
           AND p.type_paiement = 'CLIENT'
           AND p.note = 'AVANCE_INITIALE'
       ) AS has_initial_payment
     FROM modele_client mo
     WHERE mo.id_modele = ?`,
    [idModele],
  );
  const modele = rows[0];
  if (!modele || modele.has_initial_payment) return 0;
  return amount(modele.avance);
}

async function validateModelePayment(idClient, idModele, montant, excludePaiementId = null) {
  if (!idModele) return;
  const modele = await getModeleById(idModele);
  if (!modele) throw new Error('Modèle introuvable');
  if (modele.id_client !== idClient) throw new Error('Le modèle ne correspond pas au client');

  const paid = await getModelePaymentsTotal(idModele, excludePaiementId);
  const advanceFallback = await getModeleAdvanceFallback(idModele);
  const due = Math.max(amount(modele.prix) - advanceFallback - paid, 0);
  if (montant > due) throw new Error('Montant superieur au reste a payer pour ce modèle');
}

async function getPaidModeleDeliveries(idClient) {
  const rows = await query(
    `SELECT mo.id_modele, mo.id_mesure, mo.nom_modele, mo.prix, mo.avance,
            COALESCE((SELECT SUM(p.montant) FROM paiement p WHERE p.id_modele = mo.id_modele), 0) AS toplam_paye,
            EXISTS(
              SELECT 1 FROM paiement p
              WHERE p.id_modele = mo.id_modele
                AND p.type_paiement = 'CLIENT'
                AND p.note = 'AVANCE_INITIALE'
            ) AS has_initial_payment
     FROM modele_client mo
     WHERE mo.id_client = ? AND lower(COALESCE(mo.statut, '')) != 'paye'`,
    [idClient],
  );
  return rows.filter(item => {
    const advanceFallback = item.has_initial_payment ? 0 : amount(item.avance);
    return amount(item.prix) - advanceFallback - amount(item.toplam_paye) <= 0;
  });
}

async function findPendingLivraisonRendezvous(idClient, idMesure = null) {
  const params = [idClient];
  let queryText = `SELECT * FROM rendezvous
     WHERE id_client = ?
       AND statut = 'PLANIFIE'
       AND upper(type_rendezvous) LIKE '%LIVRAISON%'`;

  if (idMesure) {
    queryText += '\n       AND id_mesure = ?';
    params.push(idMesure);
  }

  queryText += '\n     ORDER BY date_rdv ASC\n     LIMIT 1';
  const rows = await query(queryText, params);
  return rows[0] || null;
}

async function completeModelDelivery(idClient, modele) {
  await execute('UPDATE modele_client SET statut = ? WHERE id_modele = ?', ['PAYE', modele.id_modele]);
  await execute('UPDATE client SET livraisons_count = livraisons_count + 1 WHERE id_client = ?', [idClient]);

  const rdv = modele.id_mesure
    ? await findPendingLivraisonRendezvous(idClient, modele.id_mesure)
    : await findPendingLivraisonRendezvous(idClient);
  if (rdv) {
    await execute(
      'UPDATE rendezvous SET statut = ?, date_rdv = ?, updated_at = CURRENT_TIMESTAMP WHERE id_rendezvous = ?',
      ['TERMINE', new Date().toISOString(), rdv.id_rendezvous],
    );
  }

  await createHabitMovement({
    type_mouvement: 'SORTIE',
    id_client: idClient,
    id_mesure: modele.id_mesure || null,
    id_modele: modele.id_modele,
    id_rendezvous: rdv?.id_rendezvous || null,
    notes: `Livraison du modèle ${modele.nom_modele || modele.id_modele}`,
  });
  return true;
}

async function completePaidModelDeliveries(idClient) {
  const models = await getPaidModeleDeliveries(idClient);
  for (const modele of models) {
    await completeModelDelivery(idClient, modele);
  }
}

export function buildPaymentReference(type = 'CLIENT') {
  return `REF-${type === 'TAILLEUR' ? 'TAI' : 'CLI'}-${Date.now().toString().slice(-8)}`;
}

export async function listClientPaymentSummaries(search = '', status = '') {
  const rows = await query(`
    SELECT
      c.id_client,
      c.nom,
      c.prenom,
      c.contact,
      COALESCE((SELECT SUM(mo.prix) FROM modele_client mo WHERE mo.id_client = c.id_client), 0) AS prix_total,
      COALESCE((SELECT SUM(p.montant) FROM paiement p WHERE p.id_client = c.id_client AND p.type_paiement = 'CLIENT'), 0) +
      COALESCE((
        SELECT SUM(mo.avance)
        FROM modele_client mo
        WHERE mo.id_client = c.id_client
          AND NOT EXISTS (
            SELECT 1 FROM paiement p
            WHERE p.id_modele = mo.id_modele
              AND p.type_paiement = 'CLIENT'
              AND p.note = 'AVANCE_INITIALE'
          )
      ), 0) AS montant_paye,
      COALESCE((SELECT COUNT(*) FROM modele_client mo WHERE mo.id_client = c.id_client), 0) AS nombre_modeles
    FROM client c
    GROUP BY c.id_client
    ORDER BY c.date_creation DESC
  `);

  const normalized = rows.map(row => {
    const total = amount(row.prix_total);
    const paid = amount(row.montant_paye);
    return {
      ...row,
      prix_total: total,
      montant_paye: paid,
      reste_a_payer: Math.max(total - paid, 0),
      statut_paiement: paymentStatus(total, paid),
    };
  });

  const term = search.trim().toLowerCase();
  return normalized.filter(row => {
    const matchesTerm = !term || `${row.nom} ${row.prenom} ${row.contact}`.toLowerCase().includes(term);
    const matchesStatus = !status || row.statut_paiement === status;
    return matchesTerm && matchesStatus;
  });
}

export async function listTailleurPaymentSummaries(search = '', status = '') {
  const rows = await query(`
    SELECT
      t.id_tailleur,
      t.nom,
      t.prenom,
      t.contact,
      t.email,
      COALESCE((SELECT SUM(a.prix_tailleur) FROM affectation a WHERE a.id_tailleur = t.id_tailleur), 0) AS total_du,
      COALESCE((SELECT SUM(p.montant) FROM paiement p WHERE p.id_tailleur = t.id_tailleur AND p.type_paiement = 'TAILLEUR'), 0) AS montant_paye,
      COALESCE((SELECT COUNT(*) FROM affectation a WHERE a.id_tailleur = t.id_tailleur AND a.statut IN ('TERMINE', 'VALIDE')), 0) AS modeles_cousus
    FROM tailleur t
    WHERE t.actif = 1
    ORDER BY t.date_creation DESC
  `);

  const normalized = rows.map(row => {
    const total = amount(row.total_du);
    const paid = amount(row.montant_paye);
    return {
      ...row,
      total_du: total,
      montant_paye: paid,
      reste_a_payer: Math.max(total - paid, 0),
      statut_paiement: paymentStatus(total, paid),
    };
  });

  const term = search.trim().toLowerCase();
  return normalized.filter(row => {
    const matchesTerm = !term || `${row.nom} ${row.prenom} ${row.contact || ''} ${row.email || ''}`.toLowerCase().includes(term);
    const matchesStatus = !status || row.statut_paiement === status;
    return matchesTerm && matchesStatus;
  });
}

export async function getMonthlyPaymentSynthesis(month, year, status = '') {
  const targetMonth = month || new Date().getMonth() + 1;
  const targetYear = year || new Date().getFullYear();
  const clientSummaries = await listClientPaymentSummaries('', status);
  const allowedClientIds = new Set(clientSummaries.map(item => item.id_client));
  const start = new Date(Date.UTC(targetYear, targetMonth - 1, 1)).toISOString().slice(0, 19);
  const end = new Date(Date.UTC(targetYear, targetMonth, 1)).toISOString().slice(0, 19);

  const paiements = await query(
    `SELECT * FROM paiement WHERE type_paiement = 'CLIENT' AND date_paiement >= ? AND date_paiement < ?`,
    [start, end],
  );
  const modeles = await query(
    `SELECT * FROM modele_client WHERE date_creation >= ? AND date_creation < ?`,
    [start, end],
  );
  const advances = await query(
    `SELECT COALESCE(SUM(mo.avance), 0) AS total
     FROM modele_client mo
     WHERE mo.date_creation >= ? AND mo.date_creation < ?
       AND NOT EXISTS (
         SELECT 1 FROM paiement p
         WHERE p.id_modele = mo.id_modele
           AND p.type_paiement = 'CLIENT'
           AND p.note = 'AVANCE_INITIALE'
       )`,
    [start, end],
  );
  const totalAdvances = amount(advances[0]?.total);
  const sorties = await query(
    `SELECT * FROM mouvement_habit
     WHERE type_mouvement = 'SORTIE'
       AND date_mouvement >= ? AND date_mouvement < ?`,
    [start, end],
  );
  const entrees = await query(
    `SELECT * FROM mouvement_habit
     WHERE type_mouvement = 'ENTREE'
       AND date_mouvement >= ? AND date_mouvement < ?`,
    [start, end],
  );

  const filteredPaiements = paiements.filter(p => !status || allowedClientIds.has(p.id_client));
  const filteredModeles = modeles.filter(m => !status || allowedClientIds.has(m.id_client));
  const filteredSorties = sorties.filter(r => !status || allowedClientIds.has(r.id_client));
  const filteredEntrees = entrees.filter(r => !status || allowedClientIds.has(r.id_client));

  return {
    mois: targetMonth,
    annee: targetYear,
    total_recouvrement: filteredPaiements.reduce((sum, p) => sum + amount(p.montant), 0) + totalAdvances,
    total_modeles: filteredModeles.reduce((sum, m) => sum + amount(m.prix), 0),
    nombre_entrees: filteredEntrees.length,
    nombre_sorties: filteredSorties.length,
  };
}

export async function getClientPaymentDetails(idClient) {
  const clientRows = await query('SELECT * FROM client WHERE id_client = ?', [idClient]);
  const client = clientRows[0];
  if (!client) return null;

  const modeles = await query(
    `SELECT mo.id_modele, mo.nom_modele, mo.prix, mo.avance, mo.statut,
            EXISTS(
              SELECT 1 FROM paiement p
              WHERE p.id_modele = mo.id_modele
                AND p.type_paiement = 'CLIENT'
                AND p.note = 'AVANCE_INITIALE'
            ) AS has_initial_payment
     FROM modele_client mo
     WHERE mo.id_client = ?
     ORDER BY mo.date_creation DESC`,
    [idClient],
  );
  const paiements = await query(
    `SELECT p.*, mo.nom_modele AS modele_nom
     FROM paiement p
     LEFT JOIN modele_client mo ON mo.id_modele = p.id_modele
     WHERE p.id_client = ?
     ORDER BY p.date_paiement DESC`,
    [idClient],
  );
  const prixTotal = modeles.reduce((sum, item) => sum + amount(item.prix), 0);
  const montantPaye = paiements.reduce((sum, item) => sum + amount(item.montant), 0) +
    modeles.reduce((sum, item) => sum + (item.has_initial_payment ? 0 : amount(item.avance)), 0);

  return {
    ...client,
    modeles,
    paiements,
    prix_total: prixTotal,
    montant_paye: montantPaye,
    reste_a_payer: Math.max(prixTotal - montantPaye, 0),
    statut_paiement: paymentStatus(prixTotal, montantPaye),
  };
}

export async function getTailleurPaymentDetails(idTailleur) {
  const tailleurRows = await query('SELECT * FROM tailleur WHERE id_tailleur = ?', [idTailleur]);
  const tailleur = tailleurRows[0];
  if (!tailleur) return null;

  const affectations = await query(`
    SELECT a.*, c.nom AS client_nom, c.prenom AS client_prenom, m.type_vetement
    FROM affectation a
    JOIN client c ON c.id_client = a.id_client
    LEFT JOIN mesure m ON m.id_mesure = a.id_mesure
    WHERE a.id_tailleur = ?
    ORDER BY a.date_creation DESC
  `, [idTailleur]);
  const paiements = await query("SELECT * FROM paiement WHERE id_tailleur = ? AND type_paiement = 'TAILLEUR' ORDER BY date_paiement DESC", [idTailleur]);
  const totalDu = affectations.reduce((sum, item) => sum + amount(item.prix_tailleur), 0);
  const montantPaye = paiements.reduce((sum, item) => sum + amount(item.montant), 0);

  return {
    ...tailleur,
    affectations,
    paiements,
    total_du: totalDu,
    montant_paye: montantPaye,
    reste_a_payer: Math.max(totalDu - montantPaye, 0),
    statut_paiement: paymentStatus(totalDu, montantPaye),
    modeles_cousus: affectations.filter(a => ['TERMINE', 'VALIDE'].includes(a.statut)).length,
  };
}

export async function createClientPayment(input) {
  const details = await getClientPaymentDetails(input.id_client);
  if (!details) throw new Error('Client introuvable');

  const montant = amount(input.montant);
  const modeleId = input.id_modele ? Number(input.id_modele) : null;
  if (montant <= 0) throw new Error('Montant invalide');

  if (modeleId) {
    await validateModelePayment(input.id_client, modeleId, montant);
  } else if (montant > details.reste_a_payer) {
    throw new Error('Montant superieur au reste a payer');
  }

  const reference = input.reference?.trim() || buildPaymentReference();
  const exists = await query('SELECT id_paiement FROM paiement WHERE reference = ?', [reference]);
  if (exists.length) throw new Error('La reference existe deja');

  const result = await execute(
    `INSERT INTO paiement (id_client, id_modele, montant, moyen, reference, date_paiement, type_paiement, note)
     VALUES (?, ?, ?, ?, ?, ?, 'CLIENT', ?)`,
    [
      input.id_client,
      modeleId,
      montant,
      input.moyen || 'ESPECES',
      reference,
      input.date_paiement || new Date().toISOString(),
      input.note?.trim() || null,
    ],
  );
  // Process post‑payment status updates
  await processClientPayment(result.insertId);
  return result.insertId;
}

// -----------------------------------------------------------------------------
// Post‑payment processing
// -----------------------------------------------------------------------------

/**
 * Après qu'un paiement a été enregistré, mets à jour le statut du client,
 * rend le client disponible pour la livraison, met à jour le rendez‑vous
 * éventuel et incrémente le compteur de livraisons.
 */
export async function processClientPayment(idPaiement) {
  // Récupérer le paiement et le client associé
  const rows = await query('SELECT * FROM paiement WHERE id_paiement = ?', [idPaiement]);
  const paiement = rows[0];
  if (!paiement) return;

  const clientDetails = await getClientPaymentDetails(paiement.id_client);
  if (!clientDetails) return;

  // Mettre à jour les livraisons de modèles qui sont devenues entièrement payées.
  await completePaidModelDeliveries(paiement.id_client);

  // Si le client est entièrement payé, mettre à jour le statut et la disponibilité
  const updatedDetails = await getClientPaymentDetails(paiement.id_client);
  if (updatedDetails && updatedDetails.reste_a_payer <= 0) {
    await execute('UPDATE client SET statut = ?, disponible = 1, livraisons_count = livraisons_count + 1 WHERE id_client = ?', ['PAYE', paiement.id_client]);

    // Mettre à jour le prochain rendez‑vous (ou créer) pour aujourd'hui
    const rdvRows = await query('SELECT * FROM rendezvous WHERE id_client = ? AND statut = ? ORDER BY date_rdv LIMIT 1', [paiement.id_client, 'PLANIFIE']);
    if (rdvRows.length) {
      const rdv = rdvRows[0];
      await execute('UPDATE rendezvous SET date_rdv = ?, statut = ?, updated_at = CURRENT_TIMESTAMP WHERE id_rendezvous = ?', [new Date().toISOString(), 'TERMINE', rdv.id_rendezvous]);
    } else {
      // Créer un rendez‑vous de livraison immédiat si aucun n'existe
      await execute('INSERT INTO rendezvous (id_client, date_rdv, type_rendezvous, statut) VALUES (?, ?, ?, ?)', [paiement.id_client, new Date().toISOString(), 'LIVRAISON_IMMEDIAT', 'TERMINE']);
    }
  }
}

/**
 * Mise à jour d'un paiement existant (utilisé depuis l'écran "Modifier").
 */
export async function updateClientPayment(idPaiement, payload) {
  const {montant, moyen, date_paiement, note, id_modele} = payload;
  const montantNum = amount(montant);
  if (montantNum <= 0) throw new Error('Montant invalide');

  const paymentRows = await query('SELECT * FROM paiement WHERE id_paiement = ?', [idPaiement]);
  const existing = paymentRows[0];
  if (!existing) throw new Error('Paiement introuvable');

  const modeleId = id_modele ? Number(id_modele) : null;
  const clientId = existing.id_client;
  if (modeleId) {
    await validateModelePayment(clientId, modeleId, montantNum, idPaiement);
  }

  await execute(
    'UPDATE paiement SET montant = ?, moyen = ?, date_paiement = ?, note = ?, id_modele = ? WHERE id_paiement = ?',
    [montantNum, moyen || 'ESPECES', date_paiement || new Date().toISOString(), note?.trim() || null, modeleId, idPaiement],
  );
  // Re‑appliquer la logique post‑paiement
  await processClientPayment(idPaiement);
}

export async function createTailleurPayment(input) {
  const details = await getTailleurPaymentDetails(input.id_tailleur);
  if (!details) throw new Error('Tailleur introuvable');

  const montant = amount(input.montant);
  if (montant <= 0) throw new Error('Montant invalide');
  if (montant > details.reste_a_payer) throw new Error('Montant superieur au reste a payer');

  const reference = input.reference?.trim() || buildPaymentReference('TAILLEUR');
  const exists = await query('SELECT id_paiement FROM paiement WHERE reference = ?', [reference]);
  if (exists.length) throw new Error('La reference existe deja');

  const result = await execute(
    `INSERT INTO paiement (id_tailleur, montant, moyen, reference, date_paiement, type_paiement, sens, note)
     VALUES (?, ?, ?, ?, ?, 'TAILLEUR', 'SORTIE', ?)`,
    [
      input.id_tailleur,
      montant,
      input.moyen || 'ESPECES',
      reference,
      input.date_paiement || new Date().toISOString(),
      input.note?.trim() || null,
    ],
  );
  return result.insertId;
}

export async function deletePayment(idPaiement) {
  await execute('DELETE FROM paiement WHERE id_paiement = ?', [idPaiement]);
}
