package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.services.SubscriptionPaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/subscription")
public class SubscriptionController {

    private static final Logger logger = LoggerFactory.getLogger(SubscriptionController.class);

    private final SubscriptionPaymentService subscriptionPaymentService;

    @Value("${app.upload.dir:./uploads/}")
    private String uploadDir;

    public SubscriptionController(SubscriptionPaymentService subscriptionPaymentService) {
        this.subscriptionPaymentService = subscriptionPaymentService;
    }

    private Utilisateur getCurrentUserOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) return null;
        return subscriptionPaymentService.getCurrentUserOrNull(auth.getName());
    }

    @GetMapping("/current")
    public ResponseEntity<?> current() {
        Utilisateur user = getCurrentUserOrNull();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentification requise"));
        }

        try {
            return ResponseEntity.ok(subscriptionPaymentService.getCurrentForUser(user));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body(Map.of(
                    "configured", false,
                    "message", "Module abonnement non initialisé"
            ));
        }
    }

    @GetMapping("/plans")
    public ResponseEntity<?> plans() {
        Utilisateur user = getCurrentUserOrNull();
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentification requise"));
        }
        try {
            return ResponseEntity.ok(subscriptionPaymentService.getPlans(true));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body(Map.of("message", "Module abonnement non initialisé"));
        }
    }

    @GetMapping("/payments")
    public ResponseEntity<?> payments() {
        Utilisateur user = getCurrentUserOrNull();
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Authentification requise"));
        if (user.getAtelier() == null) return ResponseEntity.ok(List.of());

        try {
            return ResponseEntity.ok(subscriptionPaymentService.listPaymentsForAtelier(user.getAtelier().getId()));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body(Map.of("message", "Module abonnement non initialisé"));
        }
    }

    @PostMapping("/payments/initiate")
    public ResponseEntity<?> initiatePayment(@RequestBody(required = false) InitiatePaymentRequest req) {
        Utilisateur user = getCurrentUserOrNull();
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Authentification requise"));
        try {
            String planCode = req != null ? req.planCode : null;
            String provider = req != null ? req.provider : null;
            return ResponseEntity.ok(subscriptionPaymentService.initiatePayment(user, planCode, provider));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body(Map.of("message", "Module abonnement non initialisé"));
        }
    }

    @PostMapping("/payments/manual-submit")
    public ResponseEntity<?> manualSubmitPayment(
            @RequestParam("planCode") String planCode,
            @RequestParam(value = "modePaiement", required = false) String modePaiement,
            @RequestParam(value = "transactionRef", required = false) String transactionRef,
            @RequestParam(value = "ownerNote", required = false) String ownerNote,
            @RequestParam("receipt") MultipartFile receipt
    ) {
        Utilisateur user = getCurrentUserOrNull();
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Authentification requise"));

        try {
            if (receipt == null || receipt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "La preuve de paiement est obligatoire"));
            }

            String originalName = receipt.getOriginalFilename() == null ? "receipt.jpg" : receipt.getOriginalFilename();
            String ext = originalName.contains(".") ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase() : ".jpg";
            if (!List.of(".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif", ".pdf").contains(ext)) {
                ext = ".jpg";
            }
            String fileName = "sub_receipt_" + UUID.randomUUID() + ext;

            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve("subscription_receipts");
            Files.createDirectories(uploadPath);
            Path destination = uploadPath.resolve(fileName).normalize();

            if (!destination.startsWith(uploadPath)) {
                logger.warn("Rejected suspicious receipt path for user {}: {}", user.getId(), destination);
                return ResponseEntity.badRequest().body(Map.of("message", "Nom de fichier invalide"));
            }

            try (var in = receipt.getInputStream()) {
                Files.copy(in, destination, StandardCopyOption.REPLACE_EXISTING);
            }

            String preuveUrl = "/uploads/subscription_receipts/" + fileName;
            return ResponseEntity.ok(
                    subscriptionPaymentService.submitManualPayment(
                            user,
                            planCode,
                            modePaiement,
                            transactionRef,
                            ownerNote,
                            preuveUrl
                    )
            );
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            logger.error("manual-submit failed for user {}: {}", user.getId(), ex.getMessage(), ex);
            return ResponseEntity.status(500).body(Map.of("message", "Impossible de soumettre la preuve de paiement"));
        }
    }

    @PostMapping("/payments/{paymentId}/simulate-success")
    public ResponseEntity<?> simulateSuccess(@PathVariable Long paymentId) {
        Utilisateur user = getCurrentUserOrNull();
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Authentification requise"));

        try {
            return ResponseEntity.ok(subscriptionPaymentService.approvePayment(user, paymentId));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(503).body(Map.of("message", "Module abonnement non initialisé"));
        }
    }

    public static class InitiatePaymentRequest {
        public String planCode;
        public String provider;
    }
}
