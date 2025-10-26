package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.dto.*;
import com.atelier.gestionatelier.services.AffectationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Validated
@RestController
@RequestMapping("/api/affectations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*", maxAge = 3600)
public class AffectationController {

    private final AffectationService affectationService;

    // === CRÉATION D'AFFECTATION (PROPRIETAIRE/SECRETAIRE seulement) ===
    @PostMapping
    public ResponseEntity<ApiResponseDTO<List<AffectationDTO>>> creerAffectation(
            @Valid @RequestBody AffectationRequestDTO requestDTO,
            @RequestParam UUID atelierId,
            @RequestHeader("X-User-Id") UUID createurId) {

        log.info("📝 POST /api/affectations - Atelier: {}, Createur: {}", atelierId, createurId);

        try {
            List<AffectationDTO> affectationsCreees = affectationService.creerAffectation(requestDTO, atelierId, createurId);

            return ResponseEntity.ok(ApiResponseDTO.success(
                    affectationsCreees,
                    "✅ " + affectationsCreees.size() + " affectation(s) créée(s) avec succès"
            ));

        } catch (Exception e) {
            log.error("❌ Erreur création affectation: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponseDTO.error("❌ " + e.getMessage()));
        }
    }

    // === LECTURE D'AFFECTATIONS AVEC PERMISSIONS ===
    @GetMapping
    public ResponseEntity<ApiResponseDTO<List<AffectationDTO>>> getAffectations(
            @RequestParam UUID atelierId,
            @RequestHeader("X-User-Id") UUID utilisateurId,
            @RequestHeader("X-User-Role") String role,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) UUID tailleurId) {

        log.info("📋 GET /api/affectations - Atelier: {}, User: {}, Role: {}, Statut: {}, Tailleur: {}",
                atelierId, utilisateurId, role, statut, tailleurId);

        try {
            List<AffectationDTO> affectations = affectationService.getAffectationsWithPermissions(atelierId, utilisateurId, role);

            // Appliquer les filtres supplémentaires
            if (statut != null && !statut.isEmpty()) {
                affectations = affectations.stream()
                        .filter(a -> a.getStatut().equals(statut))
                        .collect(Collectors.toList());
            }

            if (tailleurId != null) {
                affectations = affectations.stream()
                        .filter(a -> a.getTailleur().getId().equals(tailleurId))
                        .collect(Collectors.toList());
            }

            String message = "✅ " + affectations.size() + " affectation(s) trouvée(s)";
            if (statut != null || tailleurId != null) {
                message += " avec les filtres appliqués";
            }

            return ResponseEntity.ok(ApiResponseDTO.success(affectations, message));

        } catch (Exception e) {
            log.error("❌ Erreur récupération affectations: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(ApiResponseDTO.error("❌ " + e.getMessage()));
        }
    }

    // === DONNÉES POUR FORMULAIRE D'AFFECTATION ===
    @GetMapping("/formulaire-data")
    public ResponseEntity<ApiResponseDTO<FormulaireAffectationDataDTO>> getFormulaireData(
            @RequestParam UUID atelierId) {

        log.info("📄 GET /api/affectations/formulaire-data - Atelier: {}", atelierId);

        try {
            // Récupérer les tailleurs actifs
            List<TailleurDTO> tailleurs = affectationService.getTailleursActifs(atelierId);

            // Récupérer les clients avec mesures NON affectées seulement
            List<ClientAvecMesuresValideesDTO> clients = affectationService.getClientsAvecMesuresNonAffectees(atelierId);

            FormulaireAffectationDataDTO data = new FormulaireAffectationDataDTO();
            data.setTailleurs(tailleurs);
            data.setClients(clients);

            return ResponseEntity.ok(ApiResponseDTO.success(
                    data,
                    "✅ Données du formulaire récupérées avec succès"
            ));

        } catch (Exception e) {
            log.error("❌ Erreur récupération données formulaire: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(ApiResponseDTO.error("❌ " + e.getMessage()));
        }
    }

    // === MISE À JOUR DU STATUT ===
    @PatchMapping("/{affectationId}/statut")
    public ResponseEntity<ApiResponseDTO<AffectationDTO>> updateStatutAffectation(
            @PathVariable UUID affectationId,
            @RequestBody Map<String, String> requestBody,
            @RequestHeader("X-User-Id") UUID utilisateurId,
            @RequestHeader("X-User-Role") String role) {

        String nouveauStatut = requestBody.get("statut");
        log.info("🔄 PATCH /api/affectations/{}/statut - Nouveau statut: {}, User: {}, Role: {}",
                affectationId, nouveauStatut, utilisateurId, role);

        try {
            AffectationDTO affectationMaj = affectationService.updateStatutAffectation(
                    affectationId, nouveauStatut, utilisateurId, role);

            return ResponseEntity.ok(ApiResponseDTO.success(
                    affectationMaj,
                    "✅ Statut mis à jour: " + nouveauStatut
            ));

        } catch (RuntimeException e) {
            log.error("❌ Erreur mise à jour statut: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponseDTO.error("❌ " + e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur serveur mise à jour statut: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(ApiResponseDTO.error("❌ Erreur lors de la mise à jour du statut"));
        }
    }

    // === ANNULATION D'AFFECTATION ===
    @DeleteMapping("/{affectationId}")
    public ResponseEntity<ApiResponseDTO<Void>> annulerAffectation(
            @PathVariable UUID affectationId,
            @RequestHeader("X-User-Id") UUID utilisateurId,
            @RequestHeader("X-User-Role") String role) {

        log.info("🗑️ DELETE /api/affectations/{} - User: {}, Role: {}", affectationId, utilisateurId, role);

        try {
            affectationService.annulerAffectation(affectationId, utilisateurId, role);

            return ResponseEntity.ok(ApiResponseDTO.success(
                    null,
                    "✅ Affectation annulée avec succès"
            ));

        } catch (RuntimeException e) {
            log.error("❌ Erreur annulation affectation: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponseDTO.error("❌ " + e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur serveur annulation affectation: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(ApiResponseDTO.error("❌ Erreur lors de l'annulation de l'affectation"));
        }
    }
}