import {query} from '../database/db';
import {findMovementByReference} from './movementService';

const ATELIER = {
  nom: 'ATELIKO',
  adresse: 'Atelier local',
  telephone: '',
  message: 'ATELIKO habille votre elegance.',
};

function money(value) {
  const n = Number(String(value || '0').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});
}

function qrData(recu) {
  return [
    `TICKET ${recu.typeTicket}`,
    `Atelier: ${recu.atelierNom}`,
    `Reference: ${recu.reference}`,
    `Type: ${recu.statut}`,
    `Beneficiaire: ${recu.beneficiaire}`,
    `Montant: ${Math.round(recu.montant || 0)} FCFA`,
    `Date: ${formatDate(recu.date)}`,
    `Contact: ${recu.contact || ''}`,
  ].join('\n');
}

async function clientTotals(idClient) {
  const modeles = await query('SELECT prix, avance FROM modele_client WHERE id_client = ?', [idClient]);
  const paiements = await query("SELECT montant FROM paiement WHERE id_client = ? AND type_paiement = 'CLIENT'", [idClient]);
  const totalDu = modeles.reduce((sum, item) => sum + money(item.prix), 0);
  const totalAvance = modeles.reduce((sum, item) => sum + money(item.avance), 0);
  const totalPaye = paiements.reduce((sum, item) => sum + money(item.montant), 0);
  return {totalDu, resteAPayer: Math.max(totalDu - (totalPaye + totalAvance), 0)};
}

export async function buildPaymentReceipt(idPaiement) {
  const rows = await query(
    `SELECT p.*, c.nom AS client_nom, c.prenom AS client_prenom, c.contact AS client_contact,
            t.nom AS tailleur_nom, t.prenom AS tailleur_prenom, t.contact AS tailleur_contact, t.email AS tailleur_email
     FROM paiement p
     LEFT JOIN client c ON c.id_client = p.id_client
     LEFT JOIN tailleur t ON t.id_tailleur = p.id_tailleur
     WHERE p.id_paiement = ?`,
    [idPaiement],
  );
  const p = rows[0];
  if (!p) return null;

  let totalDu = 0;
  let resteAPayer = 0;
  if (p.type_paiement === 'CLIENT' && p.id_client) {
    const totals = await clientTotals(p.id_client);
    totalDu = totals.totalDu;
    resteAPayer = totals.resteAPayer;
  } else if (p.id_tailleur) {
    const affectations = await query('SELECT prix_tailleur FROM affectation WHERE id_tailleur = ?', [p.id_tailleur]);
    const paiements = await query("SELECT montant FROM paiement WHERE id_tailleur = ? AND type_paiement = 'TAILLEUR'", [p.id_tailleur]);
    totalDu = affectations.reduce((sum, item) => sum + money(item.prix_tailleur), 0);
    const totalPaye = paiements.reduce((sum, item) => sum + money(item.montant), 0);
    resteAPayer = Math.max(totalDu - totalPaye, 0);
  }

  const recu = {
    typeTicket: 'PAIEMENT',
    statut: p.type_paiement === 'TAILLEUR' ? 'Recu tailleur' : 'Recu client',
    reference: p.reference,
    date: p.date_paiement,
    montant: money(p.montant),
    moyenPaiement: p.moyen,
    beneficiaire: p.type_paiement === 'TAILLEUR' ? `${p.tailleur_prenom || ''} ${p.tailleur_nom || ''}`.trim() : `${p.client_prenom || ''} ${p.client_nom || ''}`.trim(),
    contact: p.type_paiement === 'TAILLEUR' ? (p.tailleur_contact || p.tailleur_email) : p.client_contact,
    totalDu,
    resteAPayer,
    atelierNom: ATELIER.nom,
    atelierAdresse: ATELIER.adresse,
    atelierTelephone: ATELIER.telephone,
    messageMarketing: ATELIER.message,
  };
  return {...recu, qrCodeData: qrData(recu)};
}

export async function buildMovementReceipt(reference) {
  const mv = await findMovementByReference(reference);
  if (!mv) return null;
  const totals = await clientTotals(mv.id_client);
  const montant = money(mv.prix);
  const recu = {
    typeTicket: mv.type_mouvement,
    statut: mv.type_mouvement === 'SORTIE' ? 'Sortie habit livre' : 'Entree habit mesure',
    reference: mv.reference,
    date: mv.date_mouvement,
    montant,
    moyenPaiement: mv.type_mouvement,
    beneficiaire: `${mv.prenom || ''} ${mv.nom || ''}`.trim(),
    contact: mv.contact,
    totalDu: totals.totalDu,
    resteAPayer: totals.resteAPayer,
    nomModele: mv.nom_modele || mv.type_vetement || 'Modele client',
    quantite: mv.quantite || 1,
    notes: mv.notes,
    atelierNom: ATELIER.nom,
    atelierAdresse: ATELIER.adresse,
    atelierTelephone: ATELIER.telephone,
    messageMarketing: ATELIER.message,
  };
  return {...recu, qrCodeData: qrData(recu)};
}

export function formatReceiptDate(value) {
  return formatDate(value);
}
