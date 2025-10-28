package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.dto.*;
import com.atelier.gestionatelier.services.DashboardService;
import com.atelier.gestionatelier.services.UtilisateurService;
import com.atelier.gestionatelier.entities.Utilisateur;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DashboardService dashboardService;
    private final UtilisateurService utilisateurService;

    /**
     * Endpoint principal pour récupérer le dashboard selon le rôle de l'utilisateur
     */
    @GetMapping
    public ResponseEntity<?> getDashboard(Authentication authentication) {
        try {
            // Récupérer l'email depuis l'authentication et chercher l'utilisateur
            String email = authentication.getName();
            Utilisateur utilisateur = utilisateurService.findByEmail(email);

            if (utilisateur == null) {
                return ResponseEntity.badRequest().body(creerErreur("Utilisateur non trouvé"));
            }

            UUID atelierId = utilisateur.getAtelier() != null ? utilisateur.getAtelier().getId() : null;

            log.info("Dashboard demandé par: {} - Rôle: {} - Atelier: {}",
                    utilisateur.getEmail(), utilisateur.getRole(), atelierId);

            switch (utilisateur.getRole()) {
                case SUPERADMIN:
                    return getSuperAdminDashboard();

                case PROPRIETAIRE:
                    return getProprietaireDashboard(atelierId);

                case TAILLEUR:
                    return getTailleurDashboard(utilisateur.getId());

                case SECRETAIRE:
                    return getSecretaireDashboard(atelierId);

                default:
                    return ResponseEntity.badRequest().body(creerErreur("Rôle non supporté: " + utilisateur.getRole()));
            }
        } catch (Exception e) {
            log.error("Erreur critique dans getDashboard", e);
            return ResponseEntity.internalServerError().body(creerErreur("Erreur serveur lors du chargement du dashboard"));
        }
    }

    /**
     * Endpoint pour les statistiques détaillées (avec période)
     */
    @GetMapping("/statistiques/{atelierId}")
    public ResponseEntity<?> getStatistiquesDetaillees(
            @PathVariable UUID atelierId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin,
            Authentication authentication) {

        try {
            // Vérifier l'authentification
            String email = authentication.getName();
            Utilisateur utilisateur = utilisateurService.findByEmail(email);

            if (utilisateur == null) {
                return ResponseEntity.badRequest().body(creerErreur("Utilisateur non trouvé"));
            }

            // Vérifier les permissions selon le rôle
            if (!hasAccessToAtelier(utilisateur, atelierId)) {
                return ResponseEntity.badRequest().body(creerErreur("Accès non autorisé à cet atelier"));
            }

            log.info("Statistiques détaillées demandées - Atelier: {} - Période: {} à {} - Par: {}",
                    atelierId, dateDebut, dateFin, utilisateur.getEmail());

            Map<String, Object> statistiques = dashboardService.getStatistiquesDetaillees(atelierId, dateDebut, dateFin);
            return ResponseEntity.ok(statistiques);

        } catch (Exception e) {
            log.error("Erreur lors du chargement des statistiques détaillées", e);
            return ResponseEntity.internalServerError()
                    .body(creerErreur("Erreur lors du chargement des statistiques"));
        }
    }

    /**
     * Endpoint pour les statistiques spécifiques au tailleur
     */
    @GetMapping("/tailleur/{tailleurId}/statistiques")
    public ResponseEntity<?> getStatistiquesTailleur(
            @PathVariable UUID tailleurId,
            Authentication authentication) {

        try {
            // Vérifier l'authentification et que l'utilisateur accède à ses propres données
            String email = authentication.getName();
            Utilisateur utilisateur = utilisateurService.findByEmail(email);

            if (utilisateur == null) {
                return ResponseEntity.badRequest().body(creerErreur("Utilisateur non trouvé"));
            }

            // Un tailleur ne peut voir que ses propres statistiques
            if (utilisateur.getRole() == com.atelier.gestionatelier.security.Role.TAILLEUR &&
                    !utilisateur.getId().equals(tailleurId)) {
                return ResponseEntity.badRequest().body(creerErreur("Accès non autorisé à ces données"));
            }

            log.info("Statistiques tailleur demandées - Tailleur: {} - Par: {}",
                    tailleurId, utilisateur.getEmail());

            Map<String, Object> statistiques = dashboardService.getStatistiquesTailleur(tailleurId);
            return ResponseEntity.ok(statistiques);

        } catch (Exception e) {
            log.error("Erreur lors du chargement des statistiques tailleur", e);
            return ResponseEntity.internalServerError()
                    .body(creerErreur("Erreur lors du chargement des statistiques tailleur"));
        }
    }

    // ========== MÉTHODES PRIVÉES POUR CHAQUE RÔLE ==========

    private ResponseEntity<?> getSuperAdminDashboard() {
        try {
            DashboardSuperAdminDTO dashboard = dashboardService.getDashboardSuperAdmin();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            log.error("Erreur dashboard SuperAdmin", e);
            return ResponseEntity.internalServerError().body(creerErreur("Erreur dashboard SuperAdmin"));
        }
    }

    private ResponseEntity<?> getProprietaireDashboard(UUID atelierId) {
        if (atelierId == null) {
            return ResponseEntity.badRequest().body(creerErreur("Aucun atelier associé à ce propriétaire"));
        }

        try {
            DashboardProprietaireDTO dashboard = dashboardService.getDashboardProprietaire(atelierId);
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            log.error("Erreur dashboard propriétaire", e);
            return ResponseEntity.internalServerError().body(creerErreur("Erreur dashboard propriétaire"));
        }
    }

    private ResponseEntity<?> getTailleurDashboard(UUID tailleurId) {
        try {
            DashboardTailleurDTO dashboard = dashboardService.getDashboardTailleur(tailleurId);
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            log.error("Erreur dashboard tailleur", e);
            return ResponseEntity.internalServerError().body(creerErreur("Erreur dashboard tailleur"));
        }
    }

    private ResponseEntity<?> getSecretaireDashboard(UUID atelierId) {
        if (atelierId == null) {
            return ResponseEntity.badRequest().body(creerErreur("Aucun atelier associé à cette secrétaire"));
        }

        try {
            DashboardSecretaireDTO dashboard = dashboardService.getDashboardSecretaire(atelierId);
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            log.error("Erreur dashboard secrétaire", e);
            return ResponseEntity.internalServerError().body(creerErreur("Erreur dashboard secrétaire"));
        }
    }

    // ========== MÉTHODES UTILITAIRES ==========

    /**
     * Vérifie si l'utilisateur a accès à l'atelier spécifié
     */
    private boolean hasAccessToAtelier(Utilisateur utilisateur, UUID atelierId) {
        // SuperAdmin a accès à tout
        if (utilisateur.getRole() == com.atelier.gestionatelier.security.Role.SUPERADMIN) {
            return true;
        }

        // Pour les autres rôles, vérifier que l'atelier correspond à celui de l'utilisateur
        return utilisateur.getAtelier() != null &&
                utilisateur.getAtelier().getId().equals(atelierId);
    }

    /**
     * Crée une réponse d'erreur standardisée
     */
    private Map<String, String> creerErreur(String message) {
        Map<String, String> erreur = new HashMap<>();
        erreur.put("error", message);
        return erreur;
    }

    /**
     * Endpoint de santé du dashboard
     */
    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "OK");
        response.put("service", "DashboardController");
        response.put("timestamp", java.time.LocalDateTime.now().toString());
        return ResponseEntity.ok(response);
    }
}