package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.dto.CreateModeleDTO;
import com.atelier.gestionatelier.dto.ModeleDTO;
import com.atelier.gestionatelier.dto.ModeleListDTO;
import com.atelier.gestionatelier.dto.UpdateModeleDTO;
import com.atelier.gestionatelier.entities.Modele;
import com.atelier.gestionatelier.services.ModeleService;
import com.atelier.gestionatelier.services.FileStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileNotFoundException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/modeles")
@RequiredArgsConstructor
public class ModeleController {

    private final ModeleService modeleService;
    private final FileStorageService fileStorageService;

    // ==================== ENDPOINTS PRINCIPAUX ====================

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ModeleDTO> creerModele(
            @RequestPart("modele") @Valid CreateModeleDTO createModeleDTO,
            @RequestPart(value = "photo", required = false) MultipartFile photoFile,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            ModeleDTO modele = modeleService.creerModeleWithPermissions(createModeleDTO, photoFile, email);
            return ResponseEntity.ok(modele);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/atelier/{atelierId}")
    public ResponseEntity<List<ModeleListDTO>> getModelesByAtelier(
            @PathVariable UUID atelierId,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            List<ModeleListDTO> modeles = modeleService.getModelesByAtelierWithPermissions(atelierId, email);
            return ResponseEntity.ok(modeles);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{id}/atelier/{atelierId}")
    public ResponseEntity<ModeleDTO> getModeleById(
            @PathVariable UUID id,
            @PathVariable UUID atelierId,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            ModeleDTO modele = modeleService.getModeleByIdWithPermissions(id, atelierId, email);
            return ResponseEntity.ok(modele);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping(value = "/{id}/atelier/{atelierId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ModeleDTO> updateModele(
            @PathVariable UUID id,
            @PathVariable UUID atelierId,
            @RequestPart("modele") @Valid UpdateModeleDTO updateModeleDTO,
            @RequestPart(value = "photo", required = false) MultipartFile photoFile,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            ModeleDTO modele = modeleService.updateModeleWithPermissions(id, atelierId, updateModeleDTO, photoFile, email);
            return ResponseEntity.ok(modele);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}/atelier/{atelierId}")
    public ResponseEntity<Map<String, String>> deleteModele(
            @PathVariable UUID id,
            @PathVariable UUID atelierId,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            modeleService.deleteModeleWithPermissions(id, atelierId, email);

            return ResponseEntity.ok(Map.of("message", "Modèle supprimé avec succès"));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Erreur lors de la suppression du modèle"));
        }
    }

    // ==================== ENDPOINTS DE RECHERCHE ET FILTRAGE ====================

    @GetMapping("/atelier/{atelierId}/search")
    public ResponseEntity<List<ModeleListDTO>> searchModeles(
            @PathVariable UUID atelierId,
            @RequestParam String q,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            List<ModeleListDTO> modeles = modeleService.searchModelesWithPermissions(atelierId, q, email);
            return ResponseEntity.ok(modeles);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/atelier/{atelierId}/categorie/{categorie}")
    public ResponseEntity<List<ModeleListDTO>> getModelesByCategorie(
            @PathVariable UUID atelierId,
            @PathVariable Modele.CategorieModele categorie,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            List<ModeleListDTO> modeles = modeleService.getModelesByCategorie(atelierId, categorie);
            return ResponseEntity.ok(modeles);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ==================== ENDPOINTS DE GESTION DES PHOTOS ====================

    // ✅ CORRECTION : Modifier l'endpoint pour qu'il corresponde au frontend
    @GetMapping("/model_photo/{filename:.+}")
    public ResponseEntity<Resource> getModelePhoto(@PathVariable String filename) {
        try {
            Resource resource = fileStorageService.loadFile(filename, "model_photo");

            // Détection du type MIME
            String contentType = "image/jpeg"; // Par défaut
            if (filename.toLowerCase().endsWith(".png")) {
                contentType = "image/png";
            } else if (filename.toLowerCase().endsWith(".gif")) {
                contentType = "image/gif";
            } else if (filename.toLowerCase().endsWith(".jpg") || filename.toLowerCase().endsWith(".jpeg")) {
                contentType = "image/jpeg";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);

        } catch (FileNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    @PostMapping("/{id}/atelier/{atelierId}/photo")
    public ResponseEntity<String> updateModelePhoto(
            @PathVariable UUID id,
            @PathVariable UUID atelierId,
            @RequestParam("photo") MultipartFile photoFile,
            Authentication authentication) {
        try {
            String email = authentication.getName();

            // Vérifier d'abord les permissions
            modeleService.getModeleByIdWithPermissions(id, atelierId, email);

            // Créer un DTO de mise à jour avec seulement la photo
            UpdateModeleDTO updateDTO = new UpdateModeleDTO();

            ModeleDTO modele = modeleService.updateModeleWithPermissions(id, atelierId, updateDTO, photoFile, email);

            return ResponseEntity.ok("Photo mise à jour avec succès");

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Erreur lors de la mise à jour de la photo");
        }
    }

    @DeleteMapping("/{id}/atelier/{atelierId}/photo")
    public ResponseEntity<String> deleteModelePhoto(
            @PathVariable UUID id,
            @PathVariable UUID atelierId,
            Authentication authentication) {
        try {
            String email = authentication.getName();

            // Récupérer le modèle pour vérifier les permissions
            ModeleDTO modele = modeleService.getModeleByIdWithPermissions(id, atelierId, email);

            // Créer un DTO de mise à jour avec photoPath null
            UpdateModeleDTO updateDTO = new UpdateModeleDTO();
            updateDTO.setPhotoPath(null);

            modeleService.updateModeleWithPermissions(id, atelierId, updateDTO, null, email);

            return ResponseEntity.ok("Photo supprimée avec succès");

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ==================== ENDPOINTS DE GESTION DU STATUT ====================

    @PatchMapping("/{id}/atelier/{atelierId}/activate")
    public ResponseEntity<Void> activateModele(
            @PathVariable UUID id,
            @PathVariable UUID atelierId,
            Authentication authentication) {
        try {
            String email = authentication.getName();

            // Vérifier les permissions
            modeleService.getModeleByIdWithPermissions(id, atelierId, email);

            modeleService.activateModele(id, atelierId);
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/{id}/atelier/{atelierId}/deactivate")
    public ResponseEntity<Void> deactivateModele(
            @PathVariable UUID id,
            @PathVariable UUID atelierId,
            Authentication authentication) {
        try {
            String email = authentication.getName();

            // Vérifier les permissions
            modeleService.getModeleByIdWithPermissions(id, atelierId, email);

            modeleService.deactivateModele(id, atelierId);
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ==================== ENDPOINTS STATISTIQUES ====================

    @GetMapping("/atelier/{atelierId}/count")
    public ResponseEntity<Long> countModelesActifs(
            @PathVariable UUID atelierId,
            Authentication authentication) {
        try {
            String email = authentication.getName();

            // Vérifier les permissions
            modeleService.getModelesByAtelierWithPermissions(atelierId, email);

            long count = modeleService.countModelesActifs(atelierId);
            return ResponseEntity.ok(count);

        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}