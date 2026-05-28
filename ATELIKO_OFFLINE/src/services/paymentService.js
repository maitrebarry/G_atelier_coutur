import {execute, query} from '../database/db';

function amount(value) {
  const n = Number(String(value || '0').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function paymentStatus(total, paid) {
  if (paid <= 0) return 'EN_ATTENTE';
  if (paid >= total && total > 0) return 'PAYE';
  return 'PARTIEL';
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
      COALESCE((SELECT SUM(p.montant) FROM paiement p WHERE p.id_client = c.id_client), 0) +
      COALESCE((SELECT SUM(mo.avance) FROM modele_client mo WHERE mo.id_client = c.id_client), 0) AS montant_paye,
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
  const pad = String(targetMonth).padStart(2, '0');
  const start = `${targetYear}-${pad}-01T00:00:00`;
  const endDate = new Date(targetYear, targetMonth, 1);
  const end = endDate.toISOString().slice(0, 19);

  const paiements = await query(
    `SELECT * FROM paiement WHERE type_paiement = 'CLIENT' AND date_paiement >= ? AND date_paiement < ?`,
    [start, end],
  );
  const modeles = await query(
    `SELECT * FROM modele_client WHERE date_creation >= ? AND date_creation < ?`,
    [start, end],
  );
  const sorties = await query(
    `SELECT DISTINCT r.id_mesure
     FROM rendezvous r
     WHERE r.date_rdv >= ? AND r.date_rdv < ?
       AND upper(r.statut) = 'TERMINE'
       AND upper(r.type_rendezvous) LIKE '%LIVRAISON%'
       AND r.id_mesure IS NOT NULL`,
    [start, end],
  );

  const filteredPaiements = paiements.filter(p => !status || allowedClientIds.has(p.id_client));
  const filteredModeles = modeles.filter(m => !status || allowedClientIds.has(m.id_client));

  return {
    mois: targetMonth,
    annee: targetYear,
    total_recouvrement: filteredPaiements.reduce((sum, p) => sum + amount(p.montant), 0),
    total_modeles: filteredModeles.reduce((sum, m) => sum + amount(m.prix), 0),
    nombre_modeles: filteredModeles.length,
    nombre_sorties: sorties.length,
  };
}

export async function getClientPaymentDetails(idClient) {
  const clientRows = await query('SELECT * FROM client WHERE id_client = ?', [idClient]);
  const client = clientRows[0];
  if (!client) return null;

  const modeles = await query('SELECT id_modele, nom_modele, prix, avance, statut FROM modele_client WHERE id_client = ? ORDER BY date_creation DESC', [idClient]);
  const paiements = await query('SELECT * FROM paiement WHERE id_client = ? ORDER BY date_paiement DESC', [idClient]);
  const prixTotal = modeles.reduce((sum, item) => sum + amount(item.prix), 0);
  const montantPaye = paiements.reduce((sum, item) => sum + amount(item.montant), 0) + modeles.reduce((sum, item) => sum + amount(item.avance), 0);

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
  if (montant <= 0) throw new Error('Montant invalide');
  if (montant > details.reste_a_payer) throw new Error('Montant superieur au reste a payer');

  const reference = input.reference?.trim() || buildPaymentReference();
  const exists = await query('SELECT id_paiement FROM paiement WHERE reference = ?', [reference]);
  if (exists.length) throw new Error('La reference existe deja');

  const result = await execute(
    `INSERT INTO paiement (id_client, montant, moyen, reference, date_paiement, type_paiement, note)
     VALUES (?, ?, ?, ?, ?, 'CLIENT', ?)`,
    [
      input.id_client,
      montant,
      input.moyen || 'ESPECES',
      reference,
      input.date_paiement || new Date().toISOString(),
      input.note?.trim() || null,
    ],
  );
  return result.insertId;
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
