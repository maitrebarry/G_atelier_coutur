package com.atelier.gestionatelier.controllers;
import com.atelier.gestionatelier.dto.*;
import com.atelier.gestionatelier.entities.Paiement;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.security.Role;
import com.atelier.gestionatelier.services.PaiementService;
import com.atelier.gestionatelier.services.UtilisateurService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/paiements")
@RequiredArgsConstructor
public class PaiementController {

    private final PaiementService paiementService;
    private final UtilisateurService utilisateurService;

    // Méthode utilitaire pour récupérer l'utilisateur connecté
    private Utilisateur getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return utilisateurService.findByEmail(email);
    }

    // ==================== ENDPOINTS PAIEMENTS CLIENTS ====================

    @PostMapping("/clients")
    public ResponseEntity<?> creerPaiementClient(@RequestBody @Valid CreatePaiementClientDto dto) {
        try {
            Utilisateur currentUser = getCurrentUser();

            // Vérifier les permissions
            if (!hasPermissionForPaiement(currentUser, dto.getAtelierId())) {
                return ResponseEntity.badRequest().body("Permission refusée pour cet atelier");
            }

            // Validation supplémentaire du montant
            ResponseEntity<?> validationResult = validerMontantPaiementClient(dto);
            if (validationResult != null) {
                return validationResult;
            }

            Paiement paiement = paiementService.creerPaiementClient(dto);
            return ResponseEntity.ok(paiement);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    @GetMapping("/clients/{clientId}")
    public ResponseEntity<?> getPaiementsClient(
            @PathVariable UUID clientId,
            @RequestParam UUID atelierId,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        try {
            Utilisateur currentUser = getCurrentUser();

            if (!hasPermissionForPaiement(currentUser, atelierId)) {
                return ResponseEntity.badRequest().body("Permission refusée pour cet atelier");
            }

            PaiementClientResponseDto response = paiementService.getPaiementsClient(clientId, atelierId, month, year);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    // ==================== ENDPOINTS PAIEMENTS TAILLEURS ====================

    @PostMapping("/tailleurs")
    public ResponseEntity<?> creerPaiementTailleur(@RequestBody @Valid CreatePaiementTailleurDto dto) {
        try {
            Utilisateur currentUser = getCurrentUser();

            // Vérifier les permissions
            if (!hasPermissionForPaiement(currentUser, dto.getAtelierId())) {
                return ResponseEntity.badRequest().body("Permission refusée pour cet atelier");
            }

            // Validation supplémentaire du montant
            ResponseEntity<?> validationResult = validerMontantPaiementTailleur(dto);
            if (validationResult != null) {
                return validationResult;
            }

            Paiement paiement = paiementService.creerPaiementTailleur(dto);
            return ResponseEntity.ok(paiement);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    @GetMapping("/tailleurs/{tailleurId}")
    public ResponseEntity<?> getPaiementsTailleur(
            @PathVariable UUID tailleurId,
            @RequestParam UUID atelierId,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        try {
            Utilisateur currentUser = getCurrentUser();

            if (!hasPermissionForPaiement(currentUser, atelierId)) {
                return ResponseEntity.badRequest().body("Permission refusée pour cet atelier");
            }

            PaiementTailleurResponseDto response = paiementService.getPaiementsTailleur(tailleurId, atelierId, month, year);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    // ==================== ENDPOINTS STATISTIQUES ET RECHERCHE ====================

    @GetMapping("/statistiques")
    public ResponseEntity<?> getStatistiquesPaiement(@RequestParam UUID atelierId) {
        try {
            Utilisateur currentUser = getCurrentUser();

            if (!hasPermissionForPaiement(currentUser, atelierId)) {
                return ResponseEntity.badRequest().body("Permission refusée pour cet atelier");
            }

            StatistiquesPaiementDto statistiques = paiementService.getStatistiquesPaiement(atelierId);
            return ResponseEntity.ok(statistiques);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    @GetMapping("/recouvrement-mensuel")
    public ResponseEntity<?> getRecouvrementMensuel(
            @RequestParam UUID atelierId,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String statutPaiement) {
        try {
            Utilisateur currentUser = getCurrentUser();

            if (!hasPermissionForPaiement(currentUser, atelierId)) {
                return ResponseEntity.badRequest().body("Permission refusée pour cet atelier");
            }

            java.time.LocalDate today = java.time.LocalDate.now();
            int selectedMonth = month != null ? month : today.getMonthValue();
            int selectedYear = year != null ? year : today.getYear();

            com.atelier.gestionatelier.dto.RecouvrementMensuelDto response = new com.atelier.gestionatelier.dto.RecouvrementMensuelDto();
            response.setMois(selectedMonth);
            response.setAnnee(selectedYear);
            response.setTotalRecouvrement(paiementService.getRecouvrementMensuel(atelierId, selectedYear, selectedMonth, statutPaiement));
            response.setTotalModeles(paiementService.getTotalModelesMensuel(atelierId, selectedYear, selectedMonth, statutPaiement));
            response.setNombreModeles(paiementService.getNombreModelesMensuel(atelierId, selectedYear, selectedMonth, statutPaiement));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    @GetMapping("/clients/recherche")
    public ResponseEntity<?> rechercherPaiementsClients(
            @RequestParam UUID atelierId,
            @RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) String statutPaiement,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        try {
            Utilisateur currentUser = getCurrentUser();

            if (!hasPermissionForPaiement(currentUser, atelierId)) {
                return ResponseEntity.badRequest().body("Permission refusée pour cet atelier");
            }

            RecherchePaiementDto criteres = new RecherchePaiementDto();
            criteres.setAtelierId(atelierId);
            criteres.setSearchTerm(searchTerm);
            criteres.setStatutPaiement(statutPaiement);
            criteres.setMonth(month);
            criteres.setYear(year);
            criteres.setType("CLIENT");

            List<PaiementClientResponseDto> resultats = paiementService.rechercherPaiementsClients(criteres);
            return ResponseEntity.ok(resultats);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    @GetMapping("/tailleurs/recherche")
    public ResponseEntity<?> rechercherPaiementsTailleurs(
            @RequestParam UUID atelierId,
            @RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) String statutPaiement,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        try {
            Utilisateur currentUser = getCurrentUser();

            if (!hasPermissionForPaiement(currentUser, atelierId)) {
                return ResponseEntity.badRequest().body("Permission refusée pour cet atelier");
            }

            RecherchePaiementDto criteres = new RecherchePaiementDto();
            criteres.setAtelierId(atelierId);
            criteres.setSearchTerm(searchTerm);
            criteres.setStatutPaiement(statutPaiement);
            criteres.setMonth(month);
            criteres.setYear(year);
            criteres.setType("TAILLEUR");

            List<PaiementTailleurResponseDto> resultats = paiementService.rechercherPaiementsTailleurs(criteres);
            return ResponseEntity.ok(resultats);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    // ==================== MÉTHODES DE VALIDATION ====================

    private ResponseEntity<?> validerMontantPaiementClient(CreatePaiementClientDto dto) {
        try {
            // Récupérer les informations actuelles du client
            PaiementClientResponseDto infoClient = paiementService.getPaiementsClient(dto.getClientId(), dto.getAtelierId(), null, null);

            // Vérifier que le montant ne dépasse pas le reste à payer
            if (dto.getMontant() > infoClient.getResteAPayer()) {
                return ResponseEntity.badRequest().body(
                        "Le montant saisi (" + dto.getMontant() + " FCFA) dépasse le reste à payer (" +
                                infoClient.getResteAPayer() + " FCFA)"
                );
            }

            // Vérifier que le montant est positif
            if (dto.getMontant() <= 0) {
                return ResponseEntity.badRequest().body("Le montant doit être supérieur à 0");
            }

            return null;

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur lors de la validation: " + e.getMessage());
        }
    }

    private ResponseEntity<?> validerMontantPaiementTailleur(CreatePaiementTailleurDto dto) {
        try {
            // Récupérer les informations actuelles du tailleur
            PaiementTailleurResponseDto infoTailleur = paiementService.getPaiementsTailleur(dto.getTailleurId(), dto.getAtelierId(), null, null);

            // Vérifier que le montant ne dépasse pas le reste à payer
            if (dto.getMontant() > infoTailleur.getResteAPayer()) {
                return ResponseEntity.badRequest().body(
                        "Le montant saisi (" + dto.getMontant() + " FCFA) dépasse le reste à payer (" +
                                infoTailleur.getResteAPayer() + " FCFA)"
                );
            }

            // Vérifier que le montant est positif
            if (dto.getMontant() <= 0) {
                return ResponseEntity.badRequest().body("Le montant doit être supérieur à 0");
            }

            // Vérifier que le tailleur a des affectations (sinon pas de paiement possible)
            if (infoTailleur.getAffectationsEnCours().isEmpty()) {
                return ResponseEntity.badRequest().body("Ce tailleur n'a aucune affectation en cours");
            }

            return null;

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur lors de la validation: " + e.getMessage());
        }
    }

    // ==================== GESTION DES PERMISSIONS ====================

    private boolean hasPermissionForPaiement(Utilisateur currentUser, UUID atelierId) {
        // SUPERADMIN a accès à tout
        if (Role.SUPERADMIN.equals(currentUser.getRole())) {
            return true;
        }

        // PROPRIETAIRE et SECRETAIRE ont accès à leur atelier
        if (List.of(Role.PROPRIETAIRE, Role.SECRETAIRE).contains(currentUser.getRole())) {
            return currentUser.getAtelier() != null &&
                    currentUser.getAtelier().getId().equals(atelierId);
        }

        // TAILLEUR ne peut pas gérer les paiements
        return false;
    }

    // ==================== ENDPOINTS POUR LES REÇUS ====================

    @GetMapping("/recu/client/{paiementId}")
    public ResponseEntity<?> getRecuPaiementClient(
            @PathVariable UUID paiementId,
            @RequestParam UUID atelierId) {
        try {
            Utilisateur currentUser = getCurrentUser();

            if (!hasPermissionForPaiement(currentUser, atelierId)) {
                return ResponseEntity.badRequest().body("Permission refusée pour cet atelier");
            }

            RecuPaiementDto recu = paiementService.genererRecuPaiementClient(paiementId, atelierId);
            return ResponseEntity.ok(recu);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    @GetMapping("/recu/tailleur/{paiementId}")
    public ResponseEntity<?> getRecuPaiementTailleur(
            @PathVariable UUID paiementId,
            @RequestParam UUID atelierId) {
        try {
            Utilisateur currentUser = getCurrentUser();

            if (!hasPermissionForPaiement(currentUser, atelierId)) {
                return ResponseEntity.badRequest().body("Permission refusée pour cet atelier");
            }

            RecuPaiementDto recu = paiementService.genererRecuPaiementTailleur(paiementId, atelierId);
            return ResponseEntity.ok(recu);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    @GetMapping(value = "/recu/client/{paiementId}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<?> downloadRecuPaiementClientPdf(
            @PathVariable UUID paiementId,
            @RequestParam UUID atelierId) {
        try {
            Utilisateur currentUser = getCurrentUser();

            if (!hasPermissionForPaiement(currentUser, atelierId)) {
                return ResponseEntity.badRequest().body("Permission refusée pour cet atelier");
            }

            RecuPaiementDto recu = paiementService.genererRecuPaiementClient(paiementId, atelierId);
            byte[] pdf = paiementService.genererRecuPaiementClientPdf(paiementId, atelierId);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=recu-client-" + recu.getReference() + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdf);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    @GetMapping(value = "/recu/tailleur/{paiementId}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<?> downloadRecuPaiementTailleurPdf(
            @PathVariable UUID paiementId,
            @RequestParam UUID atelierId) {
        try {
            Utilisateur currentUser = getCurrentUser();

            if (!hasPermissionForPaiement(currentUser, atelierId)) {
                return ResponseEntity.badRequest().body("Permission refusée pour cet atelier");
            }

            RecuPaiementDto recu = paiementService.genererRecuPaiementTailleur(paiementId, atelierId);
            byte[] pdf = paiementService.genererRecuPaiementTailleurPdf(paiementId, atelierId);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=recu-tailleur-" + recu.getReference() + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdf);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    @PostMapping("/recu/imprimer")
    public ResponseEntity<?> imprimerRecu(@RequestBody RecuPaiementDto recu) {
        try {
            // Ici vous pouvez intégrer un service d'impression
            // Pour l'instant on retourne juste le reçu formaté pour l'impression
            return ResponseEntity.ok(recu);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur lors de l'impression: " + e.getMessage());
        }
    }
}