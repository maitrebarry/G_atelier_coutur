package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.entities.Atelier;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.repositories.AtelierRepository;
import com.atelier.gestionatelier.services.SubscriptionPaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin/subscriptions")
public class AdminSubscriptionController {

    private static final Logger logger = LoggerFactory.getLogger(AdminSubscriptionController.class);

    private final SubscriptionPaymentService subscriptionPaymentService;
    private final AtelierRepository atelierRepository;
    private final JdbcTemplate jdbcTemplate;

    public AdminSubscriptionController(SubscriptionPaymentService subscriptionPaymentService,
                                       AtelierRepository atelierRepository,
                                       JdbcTemplate jdbcTemplate) {
        this.subscriptionPaymentService = subscriptionPaymentService;
        this.atelierRepository = atelierRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    private Utilisateur getCurrentUserOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) return null;
        return subscriptionPaymentService.getCurrentUserOrNull(auth.getName());
    }

    private ResponseEntity<?> requireSuperAdmin() {
        Utilisateur current = getCurrentUserOrNull();
        if (!subscriptionPaymentService.isSuperAdmin(current)) {
            return ResponseEntity.status(403).body(Map.of("message", "Accès réservé au superadmin"));
        }
        return null;
    }

    @GetMapping("/plans")
    public ResponseEntity<?> listSubscriptionPlans() {
        ResponseEntity<?> denied = requireSuperAdmin();
        if (denied != null) return denied;
        try {
            return ResponseEntity.ok(subscriptionPaymentService.getPlans(false));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body("Module abonnement non initialisé");
        }
    }

    @PostMapping("/plans")
    public ResponseEntity<?> createSubscriptionPlan(@RequestBody PlanCreateRequest req) {
        ResponseEntity<?> denied = requireSuperAdmin();
        if (denied != null) return denied;

        if (req == null || req.code == null || req.code.isBlank()) {
            return ResponseEntity.badRequest().body("Le code du plan est requis");
        }

        String code = req.code.trim().toUpperCase();
        String libelle = (req.libelle == null || req.libelle.isBlank()) ? code : req.libelle.trim();
        Integer duree = req.dureeMois == null || req.dureeMois <= 0 ? 1 : req.dureeMois;
        BigDecimal prix = req.prix == null ? BigDecimal.ZERO : req.prix;
        String devise = (req.devise == null || req.devise.isBlank()) ? "XOF" : req.devise.trim().toUpperCase();
        Boolean actif = req.actif == null ? Boolean.TRUE : req.actif;

        try {
            Number exists = jdbcTemplate.queryForObject(
                    "SELECT COUNT(1) FROM abonnement_plan WHERE UPPER(code) = ?",
                    Number.class,
                    code
            );
            if (exists != null && exists.longValue() > 0) {
                return ResponseEntity.badRequest().body("Ce code de plan existe déjà: " + code);
            }

            jdbcTemplate.update(
                    "INSERT INTO abonnement_plan (code, libelle, duree_mois, prix, devise, actif, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, now(), now())",
                    code,
                    libelle,
                    duree,
                    prix,
                    devise,
                    actif
            );

            Map<String, Object> row = jdbcTemplate.queryForMap(
                    "SELECT id, code, libelle, duree_mois, prix, devise, actif, created_at, updated_at FROM abonnement_plan WHERE code = ?",
                    code
            );
            return ResponseEntity.ok(row);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/plans/{code}")
    public ResponseEntity<?> updateSubscriptionPlan(@PathVariable String code, @RequestBody PlanUpdateRequest req) {
        ResponseEntity<?> denied = requireSuperAdmin();
        if (denied != null) return denied;
        if (req == null) return ResponseEntity.badRequest().body("Payload manquant");

        try {
            int updated = jdbcTemplate.update(
                    "UPDATE abonnement_plan SET libelle = COALESCE(?, libelle), duree_mois = COALESCE(?, duree_mois), prix = COALESCE(?, prix), devise = COALESCE(?, devise), actif = COALESCE(?, actif), updated_at = now() WHERE code = ?",
                    req.libelle,
                    req.dureeMois,
                    req.prix,
                    req.devise,
                    req.actif,
                    code
            );
            if (updated == 0) return ResponseEntity.notFound().build();

            Map<String, Object> row = jdbcTemplate.queryForMap(
                    "SELECT id, code, libelle, duree_mois, prix, devise, actif, created_at, updated_at FROM abonnement_plan WHERE code = ?",
                    code
            );
            return ResponseEntity.ok(row);
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body("Module abonnement non initialisé");
        }
    }

    @DeleteMapping("/plans/{code}")
    public ResponseEntity<?> deleteSubscriptionPlan(@PathVariable String code) {
        ResponseEntity<?> denied = requireSuperAdmin();
        if (denied != null) return denied;

        String normalizedCode = code == null ? "" : code.trim().toUpperCase();
        if (normalizedCode.isBlank()) return ResponseEntity.badRequest().body("Code plan invalide");
        if ("MENSUEL".equalsIgnoreCase(normalizedCode)) {
            return ResponseEntity.badRequest().body("Le plan MENSUEL ne peut pas être supprimé");
        }

        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT id FROM abonnement_plan WHERE UPPER(code) = ? LIMIT 1",
                    normalizedCode
            );
            if (rows.isEmpty()) return ResponseEntity.notFound().build();

            Long planId = ((Number) rows.get(0).get("id")).longValue();
            Number usage = jdbcTemplate.queryForObject(
                    "SELECT COUNT(1) FROM abonnement_atelier WHERE plan_id = ?",
                    Number.class,
                    planId
            );
            long usageCount = usage == null ? 0L : usage.longValue();

            if (usageCount > 0) {
                jdbcTemplate.update(
                        "UPDATE abonnement_plan SET actif = FALSE, updated_at = now() WHERE id = ?",
                        planId
                );
                return ResponseEntity.ok(Map.of("ok", true, "deleted", false, "disabled", true, "message", "Plan utilisé dans l'historique: désactivé"));
            }

            jdbcTemplate.update("DELETE FROM abonnement_plan WHERE id = ?", planId);
            return ResponseEntity.ok(Map.of("ok", true, "deleted", true));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body("Module abonnement non initialisé");
        }
    }

    @GetMapping("/ateliers")
    public ResponseEntity<?> listAtelierSubscriptions() {
        ResponseEntity<?> denied = requireSuperAdmin();
        if (denied != null) return denied;

        try {
            List<Map<String, Object>> out = new ArrayList<>();
            List<Atelier> ateliers = atelierRepository.findAll();

            for (Atelier atelier : ateliers) {
                Optional<Map<String, Object>> row = subscriptionPaymentService.getLatestSubscriptionForAtelier(atelier.getId());
                Map<String, Object> item = new HashMap<>();
                item.put("atelier_id", atelier.getId());
                item.put("atelier_nom", atelier.getNom());
                if (row.isPresent()) {
                    item.putAll(row.get());
                }
                out.add(item);
            }
            return ResponseEntity.ok(out);
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body("Module abonnement non initialisé");
        }
    }

    @GetMapping("/ateliers/{atelierId}")
    public ResponseEntity<?> getAtelierSubscription(@PathVariable UUID atelierId) {
        ResponseEntity<?> denied = requireSuperAdmin();
        if (denied != null) return denied;

        try {
            Optional<Atelier> atelierOpt = atelierRepository.findById(atelierId);
            if (atelierOpt.isEmpty()) return ResponseEntity.notFound().build();

            Map<String, Object> out = new HashMap<>();
            out.put("atelier_id", atelierOpt.get().getId());
            out.put("atelier_nom", atelierOpt.get().getNom());
            subscriptionPaymentService.getLatestSubscriptionForAtelier(atelierId).ifPresent(out::putAll);
            return ResponseEntity.ok(out);
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body("Module abonnement non initialisé");
        }
    }

    @PostMapping("/ateliers/{atelierId}/activate")
    public ResponseEntity<?> activateAtelierSubscription(@PathVariable UUID atelierId,
                                                         @RequestBody(required = false) ActivateSubscriptionRequest req) {
        ResponseEntity<?> denied = requireSuperAdmin();
        if (denied != null) return denied;

        try {
            String planCode = req != null ? req.planCode : null;
            LocalDateTime startAt = req != null ? req.startAt : null;
            return ResponseEntity.ok(subscriptionPaymentService.activateAtelierSubscription(atelierId, planCode, startAt));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body("Module abonnement non initialisé");
        }
    }

    @PostMapping("/ateliers/{atelierId}/suspend")
    public ResponseEntity<?> suspendAtelierSubscription(@PathVariable UUID atelierId) {
        ResponseEntity<?> denied = requireSuperAdmin();
        if (denied != null) return denied;

        try {
            return ResponseEntity.ok(subscriptionPaymentService.suspendAtelierSubscription(atelierId));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body("Module abonnement non initialisé");
        }
    }

    @PutMapping("/ateliers/{atelierId}/dates")
    public ResponseEntity<?> updateAtelierSubscriptionDates(@PathVariable UUID atelierId,
                                                            @RequestBody UpdateSubscriptionDatesRequest req) {
        ResponseEntity<?> denied = requireSuperAdmin();
        if (denied != null) return denied;

        if (req == null || req.dateDebut == null || req.dateFin == null) {
            return ResponseEntity.badRequest().body("dateDebut et dateFin sont requis");
        }
        if (!req.dateFin.isAfter(req.dateDebut)) {
            return ResponseEntity.badRequest().body("dateFin doit être postérieure à dateDebut");
        }

        try {
            return ResponseEntity.ok(subscriptionPaymentService.updateAtelierSubscriptionDates(atelierId, req.dateDebut, req.dateFin));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body("Module abonnement non initialisé");
        }
    }

    @GetMapping("/payments")
    public ResponseEntity<?> listSubscriptionPayments(@RequestParam(value = "status", required = false) String status) {
        ResponseEntity<?> denied = requireSuperAdmin();
        if (denied != null) return denied;
        try {
            return ResponseEntity.ok(subscriptionPaymentService.listPaymentsForAdmin(status));
        } catch (DataAccessException ex) {
            logger.error("Erreur lors de la récupération des paiements d'abonnement", ex);
            String message = "Erreur de lecture des paiements d'abonnement";
            if (ex.getMostSpecificCause() != null && ex.getMostSpecificCause().getMessage() != null) {
                message += ": " + ex.getMostSpecificCause().getMessage();
            }
            return ResponseEntity.status(503).body(Map.of("message", message));
        }
    }

    @PostMapping("/payments/{paymentId}/approve")
    public ResponseEntity<?> approveSubscriptionPayment(@PathVariable Long paymentId) {
        ResponseEntity<?> denied = requireSuperAdmin();
        if (denied != null) return denied;

        try {
            Utilisateur current = getCurrentUserOrNull();
            return ResponseEntity.ok(subscriptionPaymentService.approvePayment(current, paymentId));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body("Module abonnement non initialisé");
        }
    }

    @PostMapping("/payments/{paymentId}/reject")
    public ResponseEntity<?> rejectSubscriptionPayment(@PathVariable Long paymentId,
                                                       @RequestBody(required = false) RejectPaymentRequest req) {
        ResponseEntity<?> denied = requireSuperAdmin();
        if (denied != null) return denied;

        try {
            Utilisateur current = getCurrentUserOrNull();
            String reason = req != null ? req.reason : null;
            return ResponseEntity.ok(subscriptionPaymentService.rejectPayment(current, paymentId, reason));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body("Module abonnement non initialisé");
        }
    }

    public static class PlanUpdateRequest {
        public String libelle;
        public Integer dureeMois;
        public BigDecimal prix;
        public String devise;
        public Boolean actif;
    }

    public static class PlanCreateRequest extends PlanUpdateRequest {
        public String code;
    }

    public static class ActivateSubscriptionRequest {
        public String planCode;
        public LocalDateTime startAt;
    }

    public static class UpdateSubscriptionDatesRequest {
        public LocalDateTime dateDebut;
        public LocalDateTime dateFin;
    }

    public static class RejectPaymentRequest {
        public String reason;
    }
}
