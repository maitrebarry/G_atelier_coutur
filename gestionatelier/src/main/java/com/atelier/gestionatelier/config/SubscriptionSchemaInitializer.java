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
                    "id BIGINT PRIMARY KEY AUTO_INCREMENT," +
                    "code VARCHAR(50) NOT NULL UNIQUE," +
                    "libelle VARCHAR(120) NOT NULL," +
                    "duree_mois INT NOT NULL," +
                    "prix DECIMAL(12,2) NOT NULL DEFAULT 0," +
                    "devise VARCHAR(10) NOT NULL DEFAULT 'XOF'," +
                    "actif BOOLEAN NOT NULL DEFAULT TRUE," +
                    "created_at DATETIME NULL," +
                    "updated_at DATETIME NULL" +
                    ")");

                jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS abonnement_atelier (" +
                    "id BIGINT PRIMARY KEY AUTO_INCREMENT," +
                    "atelier_id VARCHAR(36) NOT NULL," +
                    "plan_id BIGINT NOT NULL," +
                    "statut VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'," +
                    "date_debut DATETIME NOT NULL," +
                    "date_fin DATETIME NOT NULL," +
                    "grace_end_at DATETIME NULL," +
                    "auto_renew BOOLEAN NOT NULL DEFAULT FALSE," +
                    "created_at DATETIME NULL," +
                    "updated_at DATETIME NULL," +
                    "INDEX idx_abonnement_atelier_atelier (atelier_id)," +
                    "INDEX idx_abonnement_atelier_plan (plan_id)" +
                    ")");

            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS abonnement_paiement (" +
                    "id BIGINT PRIMARY KEY AUTO_INCREMENT," +
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
                    "paid_at DATETIME NULL," +
                    "created_at DATETIME NULL," +
                    "reviewed_by VARCHAR(36) NULL," +
                    "reviewed_at DATETIME NULL," +
                    "INDEX idx_abonnement_paiement_abonnement (abonnement_id)," +
                    "INDEX idx_abonnement_paiement_statut (statut)" +
                    ")");

            ensureDefaultPlan("MENSUEL", "Mensuel", 1);
            ensureDefaultPlan("TRIMESTRIEL", "Trimestriel", 3);
            ensureDefaultPlan("SEMESTRIEL", "Semestriel", 6);
            ensureDefaultPlan("ANNUEL", "Annuel", 12);

            migrateFromOldTableIfPresent();

            logger.info("Module abonnement initialisé");
        } catch (Exception ex) {
            logger.warn("Initialisation module abonnement ignorée: {}", ex.getMessage());
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

            private void migrateFromOldTableIfPresent() {
            Number oldTable = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'abonnement_boutique'",
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
