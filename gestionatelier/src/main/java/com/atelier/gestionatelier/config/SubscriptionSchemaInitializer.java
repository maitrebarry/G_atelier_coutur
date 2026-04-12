package com.atelier.gestionatelier.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class SubscriptionSchemaInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(SubscriptionSchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public SubscriptionSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS abonnement_plan (" +
                    // PostgreSQL uses BIGSERIAL for auto-increment primary key
                    "id BIGSERIAL PRIMARY KEY," +
                    "code VARCHAR(50) NOT NULL UNIQUE," +
                    "libelle VARCHAR(120) NOT NULL," +
                    "duree_mois INT NOT NULL," +
                    "prix DECIMAL(12,2) NOT NULL DEFAULT 0," +
                    "devise VARCHAR(10) NOT NULL DEFAULT 'XOF'," +
                    "actif BOOLEAN NOT NULL DEFAULT TRUE," +
                    "created_at TIMESTAMP NULL," +
                    "updated_at TIMESTAMP NULL" +
                    ")");

                jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS abonnement_atelier (" +
                    "id BIGSERIAL PRIMARY KEY," +
                    "atelier_id VARCHAR(36) NOT NULL," +
                    "plan_id BIGINT NOT NULL," +
                    "statut VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'," +
                    "date_debut TIMESTAMP NOT NULL," +
                    "date_fin TIMESTAMP NOT NULL," +
                    "grace_end_at TIMESTAMP NULL," +
                    "auto_renew BOOLEAN NOT NULL DEFAULT FALSE," +
                    "created_at TIMESTAMP NULL," +
                    "updated_at TIMESTAMP NULL" +
                    ")");
            // create indexes separately for PostgreSQL
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_abonnement_atelier_atelier ON abonnement_atelier(atelier_id)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_abonnement_atelier_plan ON abonnement_atelier(plan_id)");

            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS abonnement_paiement (" +
                    "id BIGSERIAL PRIMARY KEY," +
                    "abonnement_id BIGINT NOT NULL," +
                    "reference VARCHAR(100) NOT NULL UNIQUE," +
                    "provider VARCHAR(40) NULL," +
                    "mode_paiement VARCHAR(40) NULL," +
                    "plan_code VARCHAR(50) NULL," +
                    "transaction_ref VARCHAR(120) NULL," +
                    "owner_note TEXT NULL," +
                    "preuve_url VARCHAR(255) NULL," +
                    "review_note TEXT NULL," +
                    "montant DECIMAL(12,2) NOT NULL DEFAULT 0," +
                    "devise VARCHAR(10) NOT NULL DEFAULT 'XOF'," +
                    "statut VARCHAR(30) NOT NULL DEFAULT 'PENDING'," +
                    "paid_at TIMESTAMP NULL," +
                    "created_at TIMESTAMP NULL," +
                    "reviewed_by VARCHAR(36) NULL," +
                    "reviewed_at TIMESTAMP NULL" +
                    ")");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_abonnement_paiement_abonnement ON abonnement_paiement(abonnement_id)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_abonnement_paiement_statut ON abonnement_paiement(statut)");

                    ensureLegacyColumns();

            ensureDefaultPlan("MENSUEL", "Mensuel", 1);
            ensureDefaultPlan("TRIMESTRIEL", "Trimestriel", 3);
            ensureDefaultPlan("SEMESTRIEL", "Semestriel", 6);
            ensureDefaultPlan("ANNUEL", "Annuel", 12);

            try {
                migrateFromOldTableIfPresent();
            } catch (Exception ex) {
                logger.warn("Migration legacy abonnement échouée, mais module initialisé : {}", ex.getMessage());
            }

            logger.info("Module abonnement initialisé");
        } catch (Exception ex) {
            logger.error("Erreur d'initialisation du module abonnement : {}", ex.getMessage(), ex);
        }
    }

    private void ensureDefaultPlan(String code, String libelle, int dureeMois) {
        jdbcTemplate.update(
                "INSERT INTO abonnement_plan (code, libelle, duree_mois, prix, devise, actif, created_at, updated_at) " +
                        "SELECT ?, ?, ?, 0, 'XOF', TRUE, now(), now() " +
                        "WHERE NOT EXISTS (SELECT 1 FROM abonnement_plan WHERE code = ?)",
                code,
                libelle,
                dureeMois,
                code
        );
    }

    private void ensureLegacyColumns() {
        jdbcTemplate.execute("ALTER TABLE abonnement_paiement ADD COLUMN IF NOT EXISTS provider VARCHAR(40) NULL");
        jdbcTemplate.execute("ALTER TABLE abonnement_paiement ADD COLUMN IF NOT EXISTS mode_paiement VARCHAR(40) NULL");
        jdbcTemplate.execute("ALTER TABLE abonnement_paiement ADD COLUMN IF NOT EXISTS plan_code VARCHAR(50) NULL");
        jdbcTemplate.execute("ALTER TABLE abonnement_paiement ADD COLUMN IF NOT EXISTS transaction_ref VARCHAR(120) NULL");
        jdbcTemplate.execute("ALTER TABLE abonnement_paiement ADD COLUMN IF NOT EXISTS owner_note TEXT NULL");
        jdbcTemplate.execute("ALTER TABLE abonnement_paiement ADD COLUMN IF NOT EXISTS preuve_url VARCHAR(255) NULL");
        jdbcTemplate.execute("ALTER TABLE abonnement_paiement ADD COLUMN IF NOT EXISTS review_note TEXT NULL");
        jdbcTemplate.execute("ALTER TABLE abonnement_paiement ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(36) NULL");
        jdbcTemplate.execute("ALTER TABLE abonnement_paiement ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP NULL");
        jdbcTemplate.execute("ALTER TABLE abonnement_plan ADD COLUMN IF NOT EXISTS devise VARCHAR(10) NOT NULL DEFAULT 'XOF'");
        jdbcTemplate.execute("ALTER TABLE abonnement_plan ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT TRUE");
        jdbcTemplate.execute("ALTER TABLE abonnement_plan ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL");
        jdbcTemplate.execute("ALTER TABLE abonnement_plan ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL");
        jdbcTemplate.execute("ALTER TABLE abonnement_atelier ADD COLUMN IF NOT EXISTS grace_end_at TIMESTAMP NULL");
        jdbcTemplate.execute("ALTER TABLE abonnement_atelier ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT FALSE");
        jdbcTemplate.execute("ALTER TABLE abonnement_atelier ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL");
        jdbcTemplate.execute("ALTER TABLE abonnement_atelier ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL");
    }

    private void migrateFromOldTableIfPresent() {
        Number oldTable = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'abonnement_boutique'",
                Number.class
        );
        if (oldTable == null || oldTable.longValue() == 0) return;

        Number migratedCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM abonnement_atelier",
                Number.class
        );
        if (migratedCount != null && migratedCount.longValue() > 0) return;

        jdbcTemplate.update(
                "INSERT INTO abonnement_atelier (id, atelier_id, plan_id, statut, date_debut, date_fin, grace_end_at, auto_renew, created_at, updated_at) " +
                        "SELECT id, atelier_id, plan_id, statut, date_debut, date_fin, grace_end_at, auto_renew, created_at, updated_at FROM abonnement_boutique"
        );
    }
}
