package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.entities.Notification;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.repositories.NotificationRepository;
import com.atelier.gestionatelier.repositories.UtilisateurRepository;
import com.atelier.gestionatelier.security.Role;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class SubscriptionPaymentService {

    private final JdbcTemplate jdbcTemplate;
    private final UtilisateurRepository utilisateurRepository;
    private final NotificationRepository notificationRepository;

    public SubscriptionPaymentService(JdbcTemplate jdbcTemplate,
                                      UtilisateurRepository utilisateurRepository,
                                      NotificationRepository notificationRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.utilisateurRepository = utilisateurRepository;
        this.notificationRepository = notificationRepository;
    }

    public List<Map<String, Object>> listPaymentsForAtelier(UUID atelierId) {
        return jdbcTemplate.queryForList(
                "SELECT ap.id, ap.reference, ap.provider, ap.mode_paiement, ap.plan_code, ap.transaction_ref, ap.owner_note, ap.preuve_url, ap.review_note, ap.montant, ap.devise, ap.statut, ap.paid_at, ap.created_at, ap.reviewed_at " +
                        "FROM abonnement_paiement ap " +
                        "JOIN abonnement_atelier ab ON ab.id = ap.abonnement_id " +
                        "WHERE ab.atelier_id = ? " +
                        "ORDER BY ap.id DESC",
                atelierId.toString()
        );
    }

    public List<Map<String, Object>> listPaymentsForAdmin(String status) {
        String normalizedStatus = status == null ? null : status.trim().toUpperCase();
        if (normalizedStatus == null || normalizedStatus.isBlank()) {
            return jdbcTemplate.queryForList(
                    "SELECT ap.id, ap.reference, ap.provider, ap.mode_paiement, ap.plan_code, ap.transaction_ref, ap.owner_note, ap.preuve_url, ap.review_note, ap.montant, ap.devise, ap.statut, ap.paid_at, ap.created_at, ap.reviewed_at, ab.atelier_id " +
                            "FROM abonnement_paiement ap " +
                            "JOIN abonnement_atelier ab ON ab.id = ap.abonnement_id " +
                            "ORDER BY ap.id DESC"
            );
        }
        return jdbcTemplate.queryForList(
                "SELECT ap.id, ap.reference, ap.provider, ap.mode_paiement, ap.plan_code, ap.transaction_ref, ap.owner_note, ap.preuve_url, ap.review_note, ap.montant, ap.devise, ap.statut, ap.paid_at, ap.created_at, ap.reviewed_at, ab.atelier_id " +
                        "FROM abonnement_paiement ap " +
                        "JOIN abonnement_atelier ab ON ab.id = ap.abonnement_id " +
                        "WHERE UPPER(ap.statut) = ? " +
                        "ORDER BY ap.id DESC",
                normalizedStatus
        );
    }

    public Map<String, String> manualPaymentNumbers() {
        Map<String, String> nums = new HashMap<>();
        nums.put("ORANGE_MONEY", "74745669");
        nums.put("WAVE", "74745669");
        nums.put("MOBICASH", "67205736");
        nums.put("ORANGE", "74745669");
        nums.put("MTN", "67205736");
        return nums;
    }

    @Transactional
    public Map<String, Object> initiatePayment(Utilisateur user, String planCode, String provider) {
        if (user == null || user.getAtelier() == null) {
            throw new IllegalArgumentException("Utilisateur ou atelier introuvable");
        }

        String normalizedPlanCode = (planCode == null || planCode.isBlank()) ? "MENSUEL" : planCode.trim().toUpperCase();
        String normalizedProvider = (provider == null || provider.isBlank()) ? "MANUEL" : provider.trim().toUpperCase();
        String modePaiement = "MANUEL";
        String atelierId = user.getAtelier().getId().toString();

        List<Map<String, Object>> plans = jdbcTemplate.queryForList(
                "SELECT id, code, libelle, prix, devise FROM abonnement_plan WHERE code = ? AND actif = TRUE LIMIT 1",
                normalizedPlanCode
        );
        if (plans.isEmpty()) {
            throw new IllegalArgumentException("Plan introuvable: " + normalizedPlanCode);
        }

        List<Map<String, Object>> existingPending = jdbcTemplate.queryForList(
                "SELECT ap.id, ap.reference, ap.provider, ap.mode_paiement, ap.plan_code, ap.montant, ap.devise, ap.statut " +
                        "FROM abonnement_paiement ap " +
                        "JOIN abonnement_atelier ab ON ab.id = ap.abonnement_id " +
                        "WHERE ab.atelier_id = ? AND ap.statut = 'PENDING' " +
                        "ORDER BY ap.id DESC LIMIT 1",
                atelierId
        );
        if (!existingPending.isEmpty()) {
            Map<String, Object> row = existingPending.get(0);
            Map<String, Object> out = new HashMap<>();
            out.put("paymentId", ((Number) row.get("id")).longValue());
            out.put("reference", row.get("reference"));
            out.put("provider", row.get("provider"));
            out.put("modePaiement", row.get("mode_paiement") != null ? row.get("mode_paiement") : modePaiement);
            out.put("planCode", row.get("plan_code"));
            out.put("amount", row.get("montant"));
            out.put("currency", row.get("devise"));
            out.put("status", row.get("statut"));
            out.put("manualPaymentNumbers", manualPaymentNumbers());
            out.put("message", "Une demande de paiement est déjà en attente de validation.");
            return out;
        }

        Long abonnementAnchorId = getLatestSubscriptionIdOrThrow(atelierId);
        String reference = "SUB-" + atelierId.substring(0, 8).toUpperCase() + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();

        Number montantN = (Number) plans.get(0).get("prix");
        String devise = String.valueOf(plans.get(0).get("devise"));

        Number paymentIdN = insertPaymentAndReturnId(
            "INSERT INTO abonnement_paiement (abonnement_id, reference, provider, mode_paiement, plan_code, montant, devise, statut, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL, now())",
            abonnementAnchorId,
            reference,
            normalizedProvider,
            modePaiement,
            normalizedPlanCode,
            montantN,
            devise
        );

        Map<String, Object> out = new HashMap<>();
        out.put("paymentId", paymentIdN.longValue());
        out.put("reference", reference);
        out.put("provider", normalizedProvider);
        out.put("modePaiement", modePaiement);
        out.put("planCode", normalizedPlanCode);
        out.put("amount", montantN);
        out.put("currency", devise);
        out.put("status", "PENDING");
        out.put("manualPaymentNumbers", manualPaymentNumbers());
        out.put("message", "Demande de paiement créée. Effectuez le paiement Mobile Money puis attendez la validation SuperAdmin.");
        return out;
    }

    @Transactional
    public Map<String, Object> submitManualPayment(Utilisateur user,
                                                   String planCode,
                                                   String modePaiement,
                                                   String transactionRef,
                                                   String ownerNote,
                                                   String preuveUrl) {
        if (user == null || user.getAtelier() == null) {
            throw new IllegalArgumentException("Utilisateur ou atelier introuvable");
        }
        if (preuveUrl == null || preuveUrl.isBlank()) {
            throw new IllegalArgumentException("La preuve de paiement est obligatoire");
        }

        String normalizedPlanCode = (planCode == null || planCode.isBlank()) ? "MENSUEL" : planCode.trim().toUpperCase();
        String normalizedMode = (modePaiement == null || modePaiement.isBlank()) ? "MANUEL" : modePaiement.trim().toUpperCase();
        if (!List.of("ORANGE_MONEY", "WAVE", "MOBICASH", "MANUEL").contains(normalizedMode)) {
            throw new IllegalArgumentException("Mode de paiement invalide");
        }

        List<Map<String, Object>> plans = jdbcTemplate.queryForList(
                "SELECT id, code, libelle, prix, devise FROM abonnement_plan WHERE code = ? AND actif = TRUE LIMIT 1",
                normalizedPlanCode
        );
        if (plans.isEmpty()) {
            throw new IllegalArgumentException("Plan introuvable: " + normalizedPlanCode);
        }

        String atelierId = user.getAtelier().getId().toString();
        List<Map<String, Object>> existingPending = jdbcTemplate.queryForList(
                "SELECT ap.id, ap.reference, ap.provider, ap.mode_paiement, ap.plan_code, ap.montant, ap.devise, ap.statut " +
                        "FROM abonnement_paiement ap " +
                        "JOIN abonnement_atelier ab ON ab.id = ap.abonnement_id " +
                        "WHERE ab.atelier_id = ? AND ap.statut = 'PENDING' " +
                        "ORDER BY ap.id DESC LIMIT 1",
                atelierId
        );
        if (!existingPending.isEmpty()) {
            Map<String, Object> row = existingPending.get(0);
            return Map.of(
                    "paymentId", ((Number) row.get("id")).longValue(),
                    "reference", row.get("reference"),
                    "status", row.get("statut"),
                    "message", "Une demande de paiement est déjà en attente de validation.",
                    "manualPaymentNumbers", manualPaymentNumbers()
            );
        }

        Long abonnementAnchorId = getLatestSubscriptionIdOrThrow(atelierId);
        String reference = "SUB-" + atelierId.substring(0, 8).toUpperCase() + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        Number montantN = (Number) plans.get(0).get("prix");
        String devise = String.valueOf(plans.get(0).get("devise"));

        Number paymentIdN = insertPaymentAndReturnId(
            "INSERT INTO abonnement_paiement (abonnement_id, reference, provider, mode_paiement, plan_code, transaction_ref, owner_note, preuve_url, montant, devise, statut, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL, now())",
            abonnementAnchorId,
            reference,
            normalizedMode,
            normalizedMode,
            normalizedPlanCode,
            (transactionRef == null || transactionRef.isBlank()) ? null : transactionRef.trim(),
            (ownerNote == null || ownerNote.isBlank()) ? null : ownerNote.trim(),
            preuveUrl,
            montantN,
            devise
        );

        return Map.of(
                "paymentId", paymentIdN.longValue(),
                "reference", reference,
                "status", "PENDING",
                "manualPaymentNumbers", manualPaymentNumbers(),
                "message", "Demande envoyée au SuperAdmin pour validation."
        );
    }

    @Transactional
    public Map<String, Object> approvePayment(Utilisateur user, Long paymentId) {
        if (user == null || paymentId == null) {
            throw new IllegalArgumentException("Paramètres invalides");
        }
        if (user.getRole() != Role.SUPERADMIN) {
            throw new IllegalArgumentException("Accès réservé au superadmin");
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT ap.id, ap.reference, ap.provider, ap.plan_code, ap.montant, ap.devise, ap.statut, " +
                        "ab.atelier_id " +
                        "FROM abonnement_paiement ap " +
                        "JOIN abonnement_atelier ab ON ab.id = ap.abonnement_id " +
                        "WHERE ap.id = ?",
                paymentId
        );
        if (rows.isEmpty()) throw new IllegalArgumentException("Paiement introuvable");

        Map<String, Object> payment = rows.get(0);
        String atelierId = String.valueOf(payment.get("atelier_id"));

        String currentStatus = String.valueOf(payment.get("statut"));
        if (!"PAID".equalsIgnoreCase(currentStatus)) {
            jdbcTemplate.update(
                    "UPDATE abonnement_paiement SET statut = 'PAID', paid_at = now(), reviewed_by = ?, reviewed_at = now(), review_note = NULL WHERE id = ?",
                    user.getId().toString(),
                    paymentId
            );
        }

        String planCode = payment.get("plan_code") != null ? String.valueOf(payment.get("plan_code")).toUpperCase() : "MENSUEL";
        List<Map<String, Object>> plans = jdbcTemplate.queryForList(
                "SELECT id, duree_mois, libelle FROM abonnement_plan WHERE code = ? AND actif = TRUE LIMIT 1",
                planCode
        );
        if (plans.isEmpty()) throw new IllegalArgumentException("Plan introuvable: " + planCode);

        Long planId = ((Number) plans.get(0).get("id")).longValue();
        Integer dureeMois = ((Number) plans.get(0).get("duree_mois")).intValue();
        String planLibelle = String.valueOf(plans.get(0).get("libelle"));

        Timestamp latestActiveFinTs = jdbcTemplate.queryForObject(
                "SELECT MAX(date_fin) FROM abonnement_atelier WHERE atelier_id = ? AND statut = 'ACTIVE'",
                Timestamp.class,
                atelierId
        );

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startAt = now;
        if (latestActiveFinTs != null) {
            LocalDateTime latestFin = latestActiveFinTs.toLocalDateTime();
            if (latestFin.isAfter(now)) startAt = latestFin;
        }
        LocalDateTime endAt = startAt.plusMonths(dureeMois);

        jdbcTemplate.update(
            "INSERT INTO abonnement_atelier (atelier_id, plan_id, statut, date_debut, date_fin, grace_end_at, auto_renew, created_at, updated_at) VALUES (?, ?, 'ACTIVE', ?, ?, NULL, FALSE, now(), now())",
            atelierId,
            planId,
            Timestamp.valueOf(startAt),
            Timestamp.valueOf(endAt)
        );

        notifyAtelierUsers(UUID.fromString(atelierId), "ABONNEMENT", "Paiement abonnement confirmé (" + planLibelle + ") - échéance au " + endAt.toLocalDate());

        Map<String, Object> out = new HashMap<>();
        out.put("ok", true);
        out.put("paymentId", paymentId);
        out.put("status", "PAID");
        out.put("startAt", startAt);
        out.put("endAt", endAt);
        return out;
    }

    @Transactional
    public Map<String, Object> rejectPayment(Utilisateur user, Long paymentId, String reason) {
        if (user == null || paymentId == null) throw new IllegalArgumentException("Paramètres invalides");
        if (user.getRole() != Role.SUPERADMIN) throw new IllegalArgumentException("Accès réservé au superadmin");

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT ap.id, ap.statut, ab.atelier_id FROM abonnement_paiement ap " +
                        "JOIN abonnement_atelier ab ON ab.id = ap.abonnement_id " +
                        "WHERE ap.id = ?",
                paymentId
        );
        if (rows.isEmpty()) throw new IllegalArgumentException("Paiement introuvable");
        String statut = String.valueOf(rows.get(0).get("statut"));
        String atelierId = String.valueOf(rows.get(0).get("atelier_id"));

        if (!"PENDING".equalsIgnoreCase(statut)) {
            throw new IllegalArgumentException("Seuls les paiements PENDING peuvent être rejetés");
        }

        jdbcTemplate.update(
                "UPDATE abonnement_paiement SET statut = 'FAILED', reviewed_by = ?, reviewed_at = now(), review_note = ? WHERE id = ?",
                user.getId().toString(),
                (reason == null || reason.isBlank()) ? null : reason.trim(),
                paymentId
        );

        String msg = "Paiement abonnement rejeté" + (reason != null && !reason.isBlank() ? (" : " + reason.trim()) : "");
        notifyAtelierUsers(UUID.fromString(atelierId), "ABONNEMENT", msg);

        return Map.of("ok", true, "paymentId", paymentId, "status", "FAILED");
    }

    public Long getLatestSubscriptionIdOrThrow(String atelierId) {
        List<Map<String, Object>> anchors = jdbcTemplate.queryForList(
                "SELECT id FROM abonnement_atelier WHERE atelier_id = ? ORDER BY id DESC LIMIT 1",
                atelierId
        );
        if (anchors.isEmpty()) {
            throw new IllegalArgumentException("Aucun abonnement de base trouvé pour cet atelier");
        }
        return ((Number) anchors.get(0).get("id")).longValue();
    }

    public List<Map<String, Object>> getPlans(boolean activeOnly) {
        if (activeOnly) {
            return jdbcTemplate.queryForList("SELECT id, code, libelle, duree_mois, prix, devise, actif, created_at, updated_at FROM abonnement_plan WHERE actif = TRUE ORDER BY duree_mois ASC");
        }
        return jdbcTemplate.queryForList("SELECT id, code, libelle, duree_mois, prix, devise, actif, created_at, updated_at FROM abonnement_plan ORDER BY duree_mois ASC");
    }

    public Optional<Map<String, Object>> getLatestSubscriptionForAtelier(UUID atelierId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT ab.id AS abonnement_id, ab.atelier_id, ab.statut, ab.date_debut, ab.date_fin, ab.grace_end_at, ab.auto_renew, p.code AS plan_code, p.libelle AS plan_libelle, p.duree_mois, p.prix, p.devise " +
                        "FROM abonnement_atelier ab " +
                        "LEFT JOIN abonnement_plan p ON p.id = ab.plan_id " +
                        "WHERE ab.atelier_id = ? ORDER BY ab.id DESC LIMIT 1",
                atelierId.toString()
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Transactional
    public Map<String, Object> activateAtelierSubscription(UUID atelierId, String planCode, LocalDateTime startAt) {
        String finalPlanCode = (planCode == null || planCode.isBlank()) ? "MENSUEL" : planCode.trim().toUpperCase();
        LocalDateTime finalStartAt = startAt != null ? startAt : LocalDateTime.now();

        List<Map<String, Object>> planRows = jdbcTemplate.queryForList(
                "SELECT id, duree_mois, libelle FROM abonnement_plan WHERE code = ? AND actif = TRUE LIMIT 1",
                finalPlanCode
        );
        if (planRows.isEmpty()) {
            throw new IllegalArgumentException("Plan introuvable ou inactif: " + finalPlanCode);
        }

        Long planId = ((Number) planRows.get(0).get("id")).longValue();
        Integer dureeMois = ((Number) planRows.get(0).get("duree_mois")).intValue();
        LocalDateTime endAt = finalStartAt.plusMonths(dureeMois);

        jdbcTemplate.update(
                "INSERT INTO abonnement_atelier (atelier_id, plan_id, statut, date_debut, date_fin, grace_end_at, auto_renew, created_at, updated_at) VALUES (?, ?, 'ACTIVE', ?, ?, NULL, FALSE, now(), now())",
                atelierId.toString(),
                planId,
                Timestamp.valueOf(finalStartAt),
                Timestamp.valueOf(endAt)
        );

        return getLatestSubscriptionForAtelier(atelierId).orElse(Map.of("ok", true));
    }

    @Transactional
    public Map<String, Object> suspendAtelierSubscription(UUID atelierId) {
        int updated = jdbcTemplate.update(
                "UPDATE abonnement_atelier SET statut = 'CANCELED', updated_at = now() WHERE id = (SELECT id2 FROM (SELECT ab.id AS id2 FROM abonnement_atelier ab WHERE ab.atelier_id = ? ORDER BY ab.id DESC LIMIT 1) x)",
                atelierId.toString()
        );
        if (updated == 0) {
            throw new IllegalArgumentException("Aucun abonnement trouvé pour cet atelier");
        }
        return Map.of("atelierId", atelierId, "status", "CANCELED");
    }

    @Transactional
    public Map<String, Object> updateAtelierSubscriptionDates(UUID atelierId, LocalDateTime dateDebut, LocalDateTime dateFin) {
        int updated = jdbcTemplate.update(
                "UPDATE abonnement_atelier SET date_debut = ?, date_fin = ?, updated_at = now() WHERE id = (SELECT id2 FROM (SELECT ab.id AS id2 FROM abonnement_atelier ab WHERE ab.atelier_id = ? ORDER BY ab.id DESC LIMIT 1) x)",
                Timestamp.valueOf(dateDebut),
                Timestamp.valueOf(dateFin),
                atelierId.toString()
        );
        if (updated == 0) {
            throw new IllegalArgumentException("Aucun abonnement trouvé pour cet atelier");
        }
        return getLatestSubscriptionForAtelier(atelierId).orElse(Map.of("ok", true));
    }

    public void notifyAtelierUsers(UUID atelierId, String type, String message) {
        // Parité avec JAKO‑DANAYA : notifier *tous* les utilisateurs liés à l'atelier.
        // Les filtres de rôle empêchaient certains comptes (ex. admin/caissier) de recevoir
        // la notification d'abonnement — d'où l'icône/badge manquant côté front.
        List<Utilisateur> users = utilisateurRepository.findByAtelierId(atelierId);
        for (Utilisateur user : users) {
            if (user == null) continue;

            boolean exists = notificationRepository
                    .findByRecipientIdAndIsReadFalseOrderByDateCreationDesc(user.getId())
                    .stream()
                    .anyMatch(n -> type.equalsIgnoreCase(n.getType()) && message.equals(n.getMessage()));
            if (!exists) {
                Notification notification = Notification.builder()
                        .recipient(user)
                        .type(type)
                        .message(message)
                        .isRead(false)
                        .build();
                notificationRepository.save(notification);
            }
        }
    }

    // Supporte plusieurs types retournés par JdbcTemplate (Timestamp, LocalDateTime, String, java.sql.Date)
    private LocalDateTime toLocalDateTime(Object obj) {
        if (obj == null) return null;
        if (obj instanceof LocalDateTime) return (LocalDateTime) obj;
        if (obj instanceof Timestamp) return ((Timestamp) obj).toLocalDateTime();
        if (obj instanceof java.sql.Date) return ((java.sql.Date) obj).toLocalDate().atStartOfDay();
        if (obj instanceof String) {
            try {
                return LocalDateTime.parse((String) obj);
            } catch (Exception e) {
                try {
                    return LocalDate.parse((String) obj).atStartOfDay();
                } catch (Exception ex) {
                    return null;
                }
            }
        }
        return null;
    }

    public boolean isSubscriptionBlocked(Map<String, Object> row) {
        if (row == null || row.isEmpty()) return false;

        String statut = row.get("statut") != null ? String.valueOf(row.get("statut")) : null;
        LocalDateTime dateFin = toLocalDateTime(row.get("date_fin"));
        LocalDateTime graceEnd = toLocalDateTime(row.get("grace_end_at"));

        if (statut == null && dateFin == null) return false;

        LocalDateTime now = LocalDateTime.now();

        boolean hardStatusBlocked = "EXPIRED".equalsIgnoreCase(statut)
                || "PAST_DUE".equalsIgnoreCase(statut)
                || "CANCELED".equalsIgnoreCase(statut);

        boolean dateBlocked = dateFin != null && now.isAfter(dateFin)
                && (graceEnd == null || now.isAfter(graceEnd));

        return hardStatusBlocked || dateBlocked;
    }

    public Map<String, Object> getCurrentForUser(Utilisateur user) {
        if (user == null || user.getAtelier() == null) {
            return Map.of("configured", false);
        }

        Optional<Map<String, Object>> subOpt = getLatestSubscriptionForAtelier(user.getAtelier().getId());
        if (subOpt.isEmpty()) {
            return Map.of(
                    "configured", false,
                    "atelierId", user.getAtelier().getId(),
                    "atelierNom", user.getAtelier().getNom()
            );
        }

        Map<String, Object> row = subOpt.get();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime fin = toLocalDateTime(row.get("date_fin"));
        Long daysRemaining = fin != null ? java.time.temporal.ChronoUnit.DAYS.between(now.toLocalDate(), fin.toLocalDate()) : null;

        boolean blocked = isSubscriptionBlocked(row);
        boolean shouldShowModal = !blocked && fin != null && daysRemaining != null && daysRemaining <= 7 && daysRemaining >= 0;

        Map<String, Object> out = new HashMap<>();
        out.put("configured", true);
        out.put("atelierId", user.getAtelier().getId());
        out.put("atelierNom", user.getAtelier().getNom());
        out.put("planCode", row.get("plan_code"));
        out.put("planLibelle", row.get("plan_libelle"));
        out.put("status", row.get("statut"));
        out.put("dateFin", row.get("date_fin"));
        out.put("daysRemaining", daysRemaining);
        out.put("blocked", blocked);
        out.put("shouldShowModal", shouldShowModal);
        out.put("message", blocked
                ? "Votre abonnement est expiré. Veuillez renouveler pour continuer."
                : (shouldShowModal ? "Votre abonnement arrive à échéance dans " + daysRemaining + " jour(s)." : null));

        if (blocked || shouldShowModal) {
            notifyAtelierUsers(user.getAtelier().getId(), "ABONNEMENT", String.valueOf(out.get("message")));
        }

        return out;
    }

    public Utilisateur getCurrentUserOrNull(String email) {
        if (email == null || email.isBlank()) return null;
        return utilisateurRepository.findByEmailIgnoreCase(email).orElse(null);
    }

    public boolean isSuperAdmin(Utilisateur user) {
        return user != null && user.getRole() == Role.SUPERADMIN;
    }

    public boolean isSubscriptionTablesMissing(DataAccessException ex) {
        return ex != null;
    }

    private Number insertPaymentAndReturnId(String sql, Object... params) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < params.length; i++) {
                ps.setObject(i + 1, params[i]);
            }
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Création du paiement impossible");
        }
        return key;
    }
}
