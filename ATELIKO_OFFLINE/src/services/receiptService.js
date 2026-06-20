import { query } from '../database/db';
import { findMovementByReference } from './movementService';
import { getUserProfile } from './userService';

const DEFAULT_ATELIER = {
  nom: 'Votre atelier',
  adresse: 'Atelier local',
  telephone: '',
  message: 'Merci pour votre confiance.',
};

async function getAtelierInfo() {
  const profile = await getUserProfile();
  const atelierName = profile?.atelier?.name || profile?.activation?.payload?.atelierName || profile?.activation?.payload?.issuedBy || DEFAULT_ATELIER.nom;
  return {
    nom: atelierName,
    adresse: DEFAULT_ATELIER.adresse,
    telephone: DEFAULT_ATELIER.telephone,
    message: DEFAULT_ATELIER.message,
  };
}

function money(value) {
  const n = Number(String(value || '0').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
  const modeles = await query(
    `SELECT mo.prix, mo.avance,
            EXISTS(
              SELECT 1 FROM paiement p
              WHERE p.id_modele = mo.id_modele
                AND p.type_paiement = 'CLIENT'
                AND p.note = 'AVANCE_INITIALE'
            ) AS has_initial_payment
     FROM modele_client mo
     WHERE mo.id_client = ?`,
    [idClient],
  );
  const paiements = await query("SELECT montant FROM paiement WHERE id_client = ? AND type_paiement = 'CLIENT'", [idClient]);

  const prixTotal = modeles.reduce((sum, item) => sum + money(item.prix), 0);
  const totalAvance = modeles.reduce((sum, item) => sum + (item.has_initial_payment ? 0 : money(item.avance)), 0);
  const totalPaye = paiements.reduce((sum, item) => sum + money(item.montant), 0);

  const totalPayeComplet = totalAvance + totalPaye;
  const resteAPayer = Math.max(prixTotal - totalPayeComplet, 0);

  return { totalDu: prixTotal, avancePaye: totalPayeComplet, resteAPayer };
}

export async function buildPaymentReceipt(idPaiement) {
  const rows = await query(
    `SELECT p.*, c.nom AS client_nom, c.prenom AS client_prenom, c.contact AS client_contact,
            t.nom AS tailleur_nom, t.prenom AS tailleur_prenom, t.contact AS tailleur_contact, t.email AS tailleur_email,
            mo.nom_modele AS modele_nom, mo.prix AS modele_prix, mo.avance AS modele_avance
     FROM paiement p
     LEFT JOIN client c ON c.id_client = p.id_client
     LEFT JOIN tailleur t ON t.id_tailleur = p.id_tailleur
     LEFT JOIN modele_client mo ON mo.id_modele = p.id_modele
     WHERE p.id_paiement = ?`,
    [idPaiement],
  );
  const p = rows[0];
  if (!p) return null;

  const atelier = await getAtelierInfo();
  let totalDu = 0;
  let avancePaye = 0;
  let resteAPayer = 0;
  if (p.type_paiement === 'CLIENT' && p.id_client) {
    if (p.id_modele) {
      totalDu = money(p.modele_prix);
      const advanceRows = await query(
        `SELECT EXISTS(
           SELECT 1 FROM paiement
           WHERE id_modele = ?
             AND type_paiement = 'CLIENT'
             AND note = 'AVANCE_INITIALE'
         ) AS has_initial_payment`,
        [p.id_modele],
      );
      avancePaye = advanceRows[0]?.has_initial_payment ? 0 : money(p.modele_avance);
      const payments = await query('SELECT COALESCE(SUM(montant), 0) AS total FROM paiement WHERE id_modele = ?', [p.id_modele]);
      avancePaye += money(payments[0]?.total);
      resteAPayer = Math.max(totalDu - avancePaye, 0);
    } else {
      const totals = await clientTotals(p.id_client);
      totalDu = totals.totalDu;
      avancePaye = totals.avancePaye;
      resteAPayer = totals.resteAPayer;
    }
  } else if (p.id_tailleur) {
    const affectations = await query('SELECT prix_tailleur FROM affectation WHERE id_tailleur = ?', [p.id_tailleur]);
    const paiements = await query("SELECT montant FROM paiement WHERE id_tailleur = ? AND type_paiement = 'TAILLEUR'", [p.id_tailleur]);
    totalDu = affectations.reduce((sum, item) => sum + money(item.prix_tailleur), 0);
    avancePaye = paiements.reduce((sum, item) => sum + money(item.montant), 0);
    resteAPayer = Math.max(totalDu - avancePaye, 0);
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
    avancePaye,
    resteAPayer,
    nomModele: p.modele_nom || null,
    atelierNom: atelier.nom,
    atelierAdresse: atelier.adresse,
    atelierTelephone: atelier.telephone,
    messageMarketing: atelier.message,
  };
  return { ...recu, qrCodeData: qrData(recu) };
}

export async function buildMovementReceipt(reference) {
  const mv = await findMovementByReference(reference);
  if (!mv) return null;
  const atelier = await getAtelierInfo();
  const totals = await clientTotals(mv.id_client);

  const nbModelesRows = await query('SELECT COUNT(*) AS count FROM modele_client WHERE id_client = ?', [mv.id_client]);
  const nombreModeles = nbModelesRows[0]?.count || 0;

  const rdvRows = await query('SELECT date_rdv FROM rendezvous WHERE id_client = ? ORDER BY date_rdv DESC LIMIT 1', [mv.id_client]);
  const dateRdv = rdvRows[0]?.date_rdv || null;

  let totalDu = totals.totalDu;
  let avancePaye = totals.avancePaye;
  if (mv.id_modele) {
    const modeleRows = await query('SELECT prix, avance, nom_modele FROM modele_client WHERE id_modele = ?', [mv.id_modele]);
    const modele = modeleRows[0];
    if (modele) {
      totalDu = money(modele.prix);
      const advanceRows = await query(
        `SELECT EXISTS(
           SELECT 1 FROM paiement
           WHERE id_modele = ?
             AND type_paiement = 'CLIENT'
             AND note = 'AVANCE_INITIALE'
         ) AS has_initial_payment`,
        [mv.id_modele],
      );
      avancePaye = advanceRows[0]?.has_initial_payment ? 0 : money(modele.avance);
      const paiementRows = await query('SELECT COALESCE(SUM(montant), 0) AS total FROM paiement WHERE id_modele = ?', [mv.id_modele]);
      avancePaye += money(paiementRows[0]?.total);
    }
  }

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
    totalDu,
    avancePaye,
    resteAPayer: Math.max(totalDu - avancePaye, 0),
    nombreModeles,
    dateRdv,
    nomModele: mv.nom_modele || mv.type_vetement || 'Modele client',
    quantite: mv.quantite || 1,
    notes: mv.notes,
    atelierNom: atelier.nom,
    atelierAdresse: atelier.adresse,
    atelierTelephone: atelier.telephone,
    messageMarketing: atelier.message,
  };
  return { ...recu, qrCodeData: qrData(recu) };
}

export async function buildCommandeReceipt(idClient) {
  const clients = await query('SELECT * FROM client WHERE id_client = ?', [idClient]);
  const c = clients[0];
  if (!c) return null;
  const totals = await clientTotals(idClient);
  
  const nbModelesRows = await query('SELECT COUNT(*) AS count FROM modele_client WHERE id_client = ?', [idClient]);
  const nombreModeles = nbModelesRows[0]?.count || 0;

  const rdvRows = await query('SELECT date_rdv FROM rendezvous WHERE id_client = ? ORDER BY date_rdv DESC LIMIT 1', [idClient]);
  const dateRdv = rdvRows[0]?.date_rdv || null;

  const atelier = await getAtelierInfo();
  const recu = {
    typeTicket: 'COMMANDE',
    statut: totals.avancePaye > 0 ? 'Recu client' : 'Solde du',
    reference: `DU-${idClient.toString().substring(0, 8).toUpperCase()}`,
    date: c.date_creation || new Date().toISOString(),
    montant: totals.avancePaye,
    moyenPaiement: totals.avancePaye > 0 ? 'ESPECES' : 'AUCUN',
    beneficiaire: `${c.prenom || ''} ${c.nom || ''}`.trim(),
    contact: c.contact,
    totalDu: totals.totalDu,
    avancePaye: totals.avancePaye,
    resteAPayer: totals.resteAPayer,
    nombreModeles,
    dateRdv,
    atelierNom: atelier.nom,
    atelierAdresse: atelier.adresse,
    atelierTelephone: atelier.telephone,
    messageMarketing: atelier.message,
  };
  return { ...recu, qrCodeData: qrData(recu) };
}

export async function buildRendezvousReadyReceipt(idRendezvous) {
  const rows = await query(
    `SELECT r.*, c.nom, c.prenom, c.contact, m.type_vetement, mo.nom_modele
     FROM rendezvous r
     JOIN client c ON c.id_client = r.id_client
     LEFT JOIN mesure m ON m.id_mesure = r.id_mesure
     LEFT JOIN modele_client mo ON mo.id_mesure = r.id_mesure
     WHERE r.id_rendezvous = ?
     ORDER BY mo.date_creation DESC
     LIMIT 1`,
    [idRendezvous],
  );
  const rdv = rows[0];
  if (!rdv) return null;

  const atelier = await getAtelierInfo();
  const recu = {
    typeTicket: 'RDV_READY',
    statut: 'Habit pret a recuperer',
    reference: `RDV-${String(idRendezvous).padStart(6, '0')}`,
    date: new Date().toISOString(),
    dateRdv: rdv.date_rdv,
    montant: 0,
    moyenPaiement: 'INFORMATION',
    beneficiaire: `${rdv.prenom || ''} ${rdv.nom || ''}`.trim(),
    contact: rdv.contact,
    totalDu: 0,
    avancePaye: 0,
    resteAPayer: 0,
    nomModele: rdv.nom_modele || rdv.type_vetement || 'Habit client',
    quantite: 1,
    notes: rdv.notes,
    atelierNom: atelier.nom,
    atelierAdresse: atelier.adresse,
    atelierTelephone: atelier.telephone,
    messageMarketing: `Bonjour ${rdv.prenom || ''}, votre habit est prêt. Merci de passer chez ${atelier.nom} pour le récupérer.`,
    readyMessage: `Votre commande est prête. Vous pouvez passer chez ${atelier.nom} pour récupérer vos habits.`,
  };
  return { ...recu, qrCodeData: qrData(recu) };
}

export function formatReceiptDate(value) {
  return formatDate(value);
}
