package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.dto.UtilisateurDTO;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.entities.Permission;
import com.atelier.gestionatelier.services.UtilisateurService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/utilisateurs")
@CrossOrigin(origins = "*")
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    public UtilisateurController(UtilisateurService utilisateurService) {
        this.utilisateurService = utilisateurService;
    }

    // ✅ VERSION ULTRA-SIMPLE - Pour test
    @GetMapping("/{id}/permissions")
    public ResponseEntity<?> getUserPermissions(@PathVariable UUID id, Authentication authentication) {
        try {
            String email = authentication.getName();

            // Récupérer l'utilisateur
            Utilisateur utilisateur = utilisateurService.getUtilisateurByIdWithPermissions(id, email);

            // Retourner directement les permissions (sans vérification complexe pour le test)
            List<Map<String, Object>> safePermissions = utilisateur.getPermissions().stream()
                    .map(permission -> {
                        Map<String, Object> permMap = new HashMap<>();
                        permMap.put("id", permission.getId());
                        permMap.put("code", permission.getCode());
                        permMap.put("description", permission.getDescription());
                        return permMap;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(safePermissions);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ CREATE avec permissions
    @PostMapping
    public ResponseEntity<?> createUtilisateur(@Valid @RequestBody UtilisateurDTO dto,
                                               BindingResult result,
                                               Authentication authentication) {
        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            result.getFieldErrors().forEach(err -> {
                errors.put(err.getField(), err.getDefaultMessage());
            });
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            String email = authentication.getName();
            Utilisateur createdUser = utilisateurService.createUtilisateurWithPermissions(dto, email);
            return ResponseEntity.ok(createdUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }


    @GetMapping
    public ResponseEntity<?> getAllUtilisateurs(Authentication authentication) {
        try {
            String email = authentication.getName();
            List<Utilisateur> utilisateurs = utilisateurService.getUtilisateursWithPermissions(email);
            return ResponseEntity.ok(utilisateurs);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUtilisateurById(@PathVariable UUID id, Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur utilisateur = utilisateurService.getUtilisateurByIdWithPermissions(id, email);
            return ResponseEntity.ok(utilisateur);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUtilisateur(@PathVariable UUID id,
                                               @RequestBody UtilisateurDTO dto,
                                               Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur updatedUser = utilisateurService.updateUtilisateurWithPermissions(id, dto, email);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUtilisateur(@PathVariable UUID id, Authentication authentication) {
        try {
            String email = authentication.getName();
            utilisateurService.deleteUtilisateurWithPermissions(id, email);
            return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé avec succès"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<?> activateUser(@PathVariable UUID id) {
        try {
            Utilisateur utilisateur = utilisateurService.activateUser(id);
            return ResponseEntity.ok(utilisateur);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<?> deactivateUser(@PathVariable UUID id) {
        try {
            Utilisateur utilisateur = utilisateurService.deactivateUser(id);
            return ResponseEntity.ok(utilisateur);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }


    // ==================== GESTION PROFIL UTILISATEUR ====================

    @PostMapping("/{id}/photo")
    public ResponseEntity<?> updateUserPhoto(@PathVariable UUID id,
                                             @RequestParam("photo") MultipartFile photo,
                                             Authentication authentication) {
        try {
            String email = authentication.getName();

            // Vérifier les permissions (l'utilisateur ne peut modifier que sa propre photo)
            Utilisateur currentUser = utilisateurService.findByEmail(email);
            if (!currentUser.getId().equals(id)) {
                return ResponseEntity.status(403).body(Map.of("error", "Vous ne pouvez modifier que votre propre photo"));
            }

            // APPEL SIMPLE : Une seule ligne !
            String photoPath = utilisateurService.updateUserPhoto(id, photo);

            return ResponseEntity.ok(Map.of(
                    "message", "Photo mise à jour avec succès",
                    "photoPath", photoPath
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    @DeleteMapping("/{id}/photo")
    public ResponseEntity<?> removeUserPhoto(@PathVariable UUID id, Authentication authentication) {
        try {
            String email = authentication.getName();

            // Vérifier les permissions
            Utilisateur currentUser = utilisateurService.findByEmail(email);
            if (!currentUser.getId().equals(id)) {
                return ResponseEntity.status(403).body(Map.of("error", "Vous ne pouvez supprimer que votre propre photo"));
            }

            utilisateurService.removeUserPhoto(id);
            return ResponseEntity.ok(Map.of("message", "Photo supprimée avec succès"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }


//    pour le mot de passe
    @PostMapping("/{id}/password")
    public ResponseEntity<?> changePassword(@PathVariable UUID id,
                                            @RequestBody Map<String, String> passwordData,
                                            Authentication authentication) {
        try {
            String email = authentication.getName();

            // Vérifier les permissions
            Utilisateur currentUser = utilisateurService.findByEmail(email);
            if (!currentUser.getId().equals(id)) {
                return ResponseEntity.status(403).body(Map.of("error", "Vous ne pouvez modifier que votre propre mot de passe"));
            }

            String currentPassword = passwordData.get("currentPassword");
            String newPassword = passwordData.get("newPassword");
            String confirmPassword = passwordData.get("confirmPassword");

            // Validation
            if (currentPassword == null || newPassword == null || confirmPassword == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Tous les champs sont requis"));
            }

            if (!newPassword.equals(confirmPassword)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Les mots de passe ne correspondent pas"));
            }

            if (newPassword.length() < 6) {
                return ResponseEntity.badRequest().body(Map.of("error", "Le mot de passe doit contenir au moins 6 caractères"));
            }

            Utilisateur updatedUser = utilisateurService.updateUserPassword(id, currentPassword, newPassword);
            return ResponseEntity.ok(Map.of("message", "Mot de passe mis à jour avec succès"));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Endpoint pour récupérer les infos du profil (incluant la photo)
    @GetMapping("/{id}/profile")
    public ResponseEntity<?> getUserProfile(@PathVariable UUID id, Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur utilisateur = utilisateurService.getUtilisateurByIdWithPermissions(id, email);

            // Retourner les infos du profil (sans le mot de passe)
            Map<String, Object> profile = new HashMap<>();
            profile.put("id", utilisateur.getId());
            profile.put("nom", utilisateur.getNom());
            profile.put("prenom", utilisateur.getPrenom());
            profile.put("email", utilisateur.getEmail());
            profile.put("role", utilisateur.getRole());
            profile.put("photoPath", utilisateur.getPhotoPath());
            profile.put("atelier", utilisateur.getAtelier());

            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }


}

