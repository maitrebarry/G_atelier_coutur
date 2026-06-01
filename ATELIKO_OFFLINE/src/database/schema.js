import {execute, query} from './db';

export async function initializeDatabase() {
  await execute('PRAGMA foreign_keys = ON');

  await execute(`
    CREATE TABLE IF NOT EXISTS client (
      id_client INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      contact TEXT NOT NULL,
      adresse TEXT,
      email TEXT,
      photo TEXT,
      date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      statut TEXT NOT NULL DEFAULT 'EN_ATTENTE',
      livraisons_count INTEGER NOT NULL DEFAULT 0,
      disponible INTEGER NOT NULL DEFAULT 0
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS mesure (
      id_mesure INTEGER PRIMARY KEY AUTOINCREMENT,
      id_client INTEGER NOT NULL,
      date_mesure TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sexe TEXT,
      type_vetement TEXT,
      epaule REAL,
      manche REAL,
      poitrine REAL,
      taille REAL,
      longueur REAL,
      fesse REAL,
      tour_manche REAL,
      longueur_poitrine REAL,
      longueur_taille REAL,
      longueur_fesse REAL,
      longueur_jupe REAL,
      habit_photo TEXT,
      ceinture REAL,
      longueur_poitrine_robe REAL,
      longueur_taille_robe REAL,
      longueur_fesse_robe REAL,
      longueur_pantalon REAL,
      cuisse REAL,
      corps REAL,
      description TEXT,
      prix REAL,
      affecte INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (id_client) REFERENCES client(id_client) ON DELETE CASCADE
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS modele_client (
      id_modele INTEGER PRIMARY KEY AUTOINCREMENT,
      id_client INTEGER NOT NULL,
      id_mesure INTEGER,
      photo TEXT,
      nom_modele TEXT NOT NULL,
      description TEXT,
      message_ia TEXT,
      prix REAL NOT NULL DEFAULT 0,
      avance REAL NOT NULL DEFAULT 0,
      statut TEXT NOT NULL DEFAULT 'EN_ATTENTE',
      categorie TEXT,
      date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      date_modification TEXT,
      FOREIGN KEY (id_client) REFERENCES client(id_client) ON DELETE CASCADE,
      FOREIGN KEY (id_mesure) REFERENCES mesure(id_mesure) ON DELETE SET NULL
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS paiement (
      id_paiement INTEGER PRIMARY KEY AUTOINCREMENT,
      id_client INTEGER,
      id_tailleur INTEGER,
      id_modele INTEGER,
      id_mesure INTEGER,
      montant REAL NOT NULL,
      moyen TEXT NOT NULL DEFAULT 'ESPECES',
      reference TEXT NOT NULL UNIQUE,
      date_paiement TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      type_paiement TEXT NOT NULL DEFAULT 'CLIENT',
      sens TEXT NOT NULL DEFAULT 'ENTREE',
      note TEXT,
      FOREIGN KEY (id_client) REFERENCES client(id_client) ON DELETE CASCADE,
      FOREIGN KEY (id_tailleur) REFERENCES tailleur(id_tailleur) ON DELETE CASCADE,
      FOREIGN KEY (id_modele) REFERENCES modele_client(id_modele) ON DELETE SET NULL,
      FOREIGN KEY (id_mesure) REFERENCES mesure(id_mesure) ON DELETE SET NULL
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS tailleur (
      id_tailleur INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      contact TEXT,
      email TEXT,
      actif INTEGER NOT NULL DEFAULT 1,
      date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS affectation (
      id_affectation INTEGER PRIMARY KEY AUTOINCREMENT,
      id_client INTEGER NOT NULL,
      id_mesure INTEGER,
      id_tailleur INTEGER NOT NULL,
      prix_tailleur REAL NOT NULL DEFAULT 0,
      statut TEXT NOT NULL DEFAULT 'EN_ATTENTE',
      date_echeance TEXT,
      date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      date_validation TEXT,
      FOREIGN KEY (id_client) REFERENCES client(id_client) ON DELETE CASCADE,
      FOREIGN KEY (id_mesure) REFERENCES mesure(id_mesure) ON DELETE SET NULL,
      FOREIGN KEY (id_tailleur) REFERENCES tailleur(id_tailleur) ON DELETE CASCADE
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS rendezvous (
      id_rendezvous INTEGER PRIMARY KEY AUTOINCREMENT,
      id_client INTEGER NOT NULL,
      id_mesure INTEGER,
      date_rdv TEXT NOT NULL,
      type_rendezvous TEXT NOT NULL,
      notes TEXT,
      statut TEXT NOT NULL DEFAULT 'PLANIFIE',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_client) REFERENCES client(id_client) ON DELETE CASCADE,
      FOREIGN KEY (id_mesure) REFERENCES mesure(id_mesure) ON DELETE SET NULL
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS mouvement_habit (
      id_mouvement INTEGER PRIMARY KEY AUTOINCREMENT,
      type_mouvement TEXT NOT NULL,
      id_client INTEGER NOT NULL,
      id_mesure INTEGER,
      id_modele INTEGER,
      id_rendezvous INTEGER,
      quantite INTEGER NOT NULL DEFAULT 1,
      reference TEXT NOT NULL UNIQUE,
      notes TEXT,
      date_mouvement TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_client) REFERENCES client(id_client) ON DELETE CASCADE,
      FOREIGN KEY (id_mesure) REFERENCES mesure(id_mesure) ON DELETE SET NULL,
      FOREIGN KEY (id_modele) REFERENCES modele_client(id_modele) ON DELETE SET NULL,
      FOREIGN KEY (id_rendezvous) REFERENCES rendezvous(id_rendezvous) ON DELETE SET NULL
    )
  `);

  await execute('CREATE INDEX IF NOT EXISTS idx_client_search ON client(nom, prenom, contact)');
  await execute('CREATE INDEX IF NOT EXISTS idx_mesure_client ON mesure(id_client)');
  await execute('CREATE INDEX IF NOT EXISTS idx_modele_client ON modele_client(id_client)');
  await execute('CREATE INDEX IF NOT EXISTS idx_paiement_client ON paiement(id_client)');
  await execute('CREATE INDEX IF NOT EXISTS idx_paiement_tailleur ON paiement(id_tailleur)');
  await execute('CREATE INDEX IF NOT EXISTS idx_rendezvous_client ON rendezvous(id_client)');

  const paiementColumns = await query("PRAGMA table_info('paiement')");
  const hasIdModele = paiementColumns.some(col => col.name === 'id_modele');
  const hasIdMesure = paiementColumns.some(col => col.name === 'id_mesure');
  if (!hasIdModele) {
    await execute('ALTER TABLE paiement ADD COLUMN id_modele INTEGER');
  }
  if (!hasIdMesure) {
    await execute('ALTER TABLE paiement ADD COLUMN id_mesure INTEGER');
  }
  await execute('CREATE INDEX IF NOT EXISTS idx_paiement_modele ON paiement(id_modele)');

  await execute(`
    INSERT INTO paiement
      (id_client, id_modele, id_mesure, montant, moyen, reference, date_paiement, type_paiement, sens, note)
    SELECT
      mo.id_client,
      mo.id_modele,
      mo.id_mesure,
      mo.avance,
      'ESPECES',
      'REF-CLI-AV-' || mo.id_client || '-' || mo.id_modele,
      COALESCE(mo.date_creation, CURRENT_TIMESTAMP),
      'CLIENT',
      'ENTREE',
      'AVANCE_INITIALE'
    FROM modele_client mo
    WHERE COALESCE(mo.avance, 0) > 0
      AND NOT EXISTS (
        SELECT 1 FROM paiement p
        WHERE p.id_modele = mo.id_modele
          AND p.type_paiement = 'CLIENT'
          AND p.note = 'AVANCE_INITIALE'
      )
      AND NOT EXISTS (
        SELECT 1 FROM paiement p
        WHERE p.reference = 'REF-CLI-AV-' || mo.id_client || '-' || mo.id_modele
      )
  `);
  await execute('CREATE INDEX IF NOT EXISTS idx_rendezvous_date ON rendezvous(date_rdv)');
  await execute('CREATE INDEX IF NOT EXISTS idx_affectation_tailleur ON affectation(id_tailleur)');
  await execute('CREATE INDEX IF NOT EXISTS idx_mouvement_client ON mouvement_habit(id_client)');
  await execute('CREATE INDEX IF NOT EXISTS idx_mouvement_type ON mouvement_habit(type_mouvement)');

  await execute(`
    CREATE TABLE IF NOT EXISTS album (
      id_album INTEGER PRIMARY KEY AUTOINCREMENT,
      photo TEXT,
      nom_modele TEXT NOT NULL,
      description TEXT,
      prix REAL NOT NULL DEFAULT 0,
      categorie TEXT,
      date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
