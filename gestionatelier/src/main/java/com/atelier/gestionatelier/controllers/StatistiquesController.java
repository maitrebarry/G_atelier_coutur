package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.services.DashboardService;
import com.atelier.gestionatelier.entities.Utilisateur;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/statistiques")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StatistiquesController {

    private final DashboardService dashboardService;

    @GetMapping("/atelier/{atelierId}")
    public ResponseEntity<?> getStatistiquesAtelier(
            @PathVariable UUID atelierId,
            @RequestParam(required = false) LocalDate dateDebut,
            @RequestParam(required = false) LocalDate dateFin,
            Authentication authentication) {

        try {
            Utilisateur utilisateur = (Utilisateur) authentication.getPrincipal();

            // Vérifier les permissions
            if (!aAccesAtelier(utilisateur, atelierId)) {
                log.warn("Accès non autorisé aux statistiques de l'atelier: {} par l'utilisateur: {}",
                        atelierId, utilisateur.getEmail());
                return ResponseEntity.status(403).body(creerErreur("Accès non autorisé"));
            }

            // Utiliser les dates par défaut si non fournies
            if (dateDebut == null) {
                dateDebut = LocalDate.now().minusMonths(1);
            }
            if (dateFin == null) {
                dateFin = LocalDate.now();
            }

            // Valider les dates
            if (dateDebut.isAfter(dateFin)) {
                return ResponseEntity.badRequest().body(creerErreur("La date de début doit être avant la date de fin"));
            }

            log.info("Chargement statistiques atelier: {} - Période: {} à {} - Utilisateur: {}",
                    atelierId, dateDebut, dateFin, utilisateur.getEmail());

            Map<String, Object> statistiques = dashboardService.getStatistiquesDetaillees(
                    atelierId, dateDebut, dateFin);

            return ResponseEntity.ok(statistiques);

        } catch (Exception e) {
            log.error("Erreur lors du chargement des statistiques atelier", e);
            return ResponseEntity.internalServerError().body(creerErreur("Erreur lors du chargement des statistiques"));
        }
    }

    @GetMapping("/tailleur/{tailleurId}")
    public ResponseEntity<?> getStatistiquesTailleur(
            @PathVariable UUID tailleurId,
            Authentication authentication) {

        try {
            Utilisateur utilisateur = (Utilisateur) authentication.getPrincipal();

            // Vérifier les permissions
            if (!aAccesTailleur(utilisateur, tailleurId)) {
                log.warn("Accès non autorisé aux statistiques du tailleur: {} par l'utilisateur: {}",
                        tailleurId, utilisateur.getEmail());
                return ResponseEntity.status(403).body(creerErreur("Accès non autorisé"));
            }

            log.info("Chargement statistiques tailleur: {} - Utilisateur: {}",
                    tailleurId, utilisateur.getEmail());

            Map<String, Object> statistiques = dashboardService.getStatistiquesTailleur(tailleurId);

            return ResponseEntity.ok(statistiques);

        } catch (Exception e) {
            log.error("Erreur lors du chargement des statistiques tailleur", e);
            return ResponseEntity.internalServerError().body(creerErreur("Erreur lors du chargement des statistiques"));
        }
    }

    @GetMapping("/globales")
    public ResponseEntity<?> getStatistiquesGlobales(Authentication authentication) {
        try {
            Utilisateur utilisateur = (Utilisateur) authentication.getPrincipal();

            // Vérifier que c'est un SuperAdmin
            if (utilisateur.getRole() != com.atelier.gestionatelier.security.Role.SUPERADMIN) {
                return ResponseEntity.status(403).body(creerErreur("Accès réservé au SuperAdmin"));
            }

            log.info("Chargement statistiques globales - SuperAdmin: {}", utilisateur.getEmail());

            // Implémenter les statistiques globales si nécessaire
            Map<String, Object> statistiques = new HashMap<>();
            statistiques.put("message", "Statistiques globales - À implémenter");
            statistiques.put("timestamp", java.time.LocalDateTime.now());

            return ResponseEntity.ok(statistiques);

        } catch (Exception e) {
            log.error("Erreur lors du chargement des statistiques globales", e);
            return ResponseEntity.internalServerError().body(creerErreur("Erreur lors du chargement des statistiques globales"));
        }
    }

    // ========== MÉTHODES DE VÉRIFICATION DES PERMISSIONS ==========
    private boolean aAccesAtelier(Utilisateur utilisateur, UUID atelierId) {
        // SuperAdmin a accès à tout
        if (utilisateur.getRole() == com.atelier.gestionatelier.security.Role.SUPERADMIN) {
            return true;
        }

        // Vérifier si l'utilisateur appartient à cet atelier
        return utilisateur.getAtelier() != null &&
                utilisateur.getAtelier().getId().equals(atelierId);
    }

    private boolean aAccesTailleur(Utilisateur utilisateur, UUID tailleurId) {
        // SuperAdmin a accès à tout
        if (utilisateur.getRole() == com.atelier.gestionatelier.security.Role.SUPERADMIN) {
            return true;
        }

        // Un tailleur peut voir ses propres statistiques
        if (utilisateur.getId().equals(tailleurId)) {
            return true;
        }

        // Propriétaire et secrétaire peuvent voir les statistiques des tailleurs de leur atelier
        if (utilisateur.getAtelier() != null) {
            // Vérifier si le tailleur appartient au même atelier
            // Cette logique dépend de votre modèle de données
            return true; // À adapter selon votre implémentation
        }

        return false;
    }

    private Map<String, String> creerErreur(String message) {
        Map<String, String> erreur = new HashMap<>();
        erreur.put("error", message);
        return erreur;
    }
}