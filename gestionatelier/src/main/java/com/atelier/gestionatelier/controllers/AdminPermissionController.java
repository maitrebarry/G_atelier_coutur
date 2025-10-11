package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.entities.Permission;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.services.PermissionService;
import com.atelier.gestionatelier.services.UtilisateurService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminPermissionController {

    private static final Logger logger = LoggerFactory.getLogger(AdminPermissionController.class);

    private final PermissionService permissionService;
    private final UtilisateurService utilisateurService;

    public AdminPermissionController(PermissionService permissionService, UtilisateurService utilisateurService) {
        this.permissionService = permissionService;
        this.utilisateurService = utilisateurService;
    }

    @GetMapping("/permissions")
    public ResponseEntity<?> getAllPermissions(Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            // Autoriser SUPERADMIN et PROPRIETAIRE
            if (!currentUser.getRole().name().equals("SUPERADMIN") &&
                    !currentUser.getRole().name().equals("PROPRIETAIRE")) {
                return ResponseEntity.status(403).body(Map.of("error", "Accès refusé."));
            }

            List<Permission> permissions = permissionService.getAllPermissions();
            return ResponseEntity.ok(permissions);
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des permissions", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/permissions")
    public ResponseEntity<?> createPermission(@RequestBody Map<String, String> request, Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            // Autoriser SUPERADMIN et PROPRIETAIRE
            if (!currentUser.getRole().name().equals("SUPERADMIN") &&
                    !currentUser.getRole().name().equals("PROPRIETAIRE")) {
                return ResponseEntity.status(403).body(Map.of("error", "Accès refusé."));
            }

            String code = request.get("code");
            String description = request.get("description");

            if (code == null || code.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Le code de la permission est requis"));
            }

            if (description == null || description.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "La description de la permission est requise"));
            }

            // Vérifier le format du code
            if (!code.matches("^[A-Z_]+$")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Le code doit contenir uniquement des lettres majuscules et des underscores"));
            }

            Permission permission = permissionService.createPermission(code, description);
            return ResponseEntity.ok(permission);
        } catch (Exception e) {
            logger.error("Erreur lors de la création de la permission", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }


    /**
     * Mettre à jour une permission existante
     */
    @PutMapping("/permissions/{permissionId}")
    public ResponseEntity<?> updatePermission(
            @PathVariable UUID permissionId,
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            // Autoriser SUPERADMIN et PROPRIETAIRE
            if (!currentUser.getRole().name().equals("SUPERADMIN") &&
                    !currentUser.getRole().name().equals("PROPRIETAIRE")) {
                return ResponseEntity.status(403).body(Map.of("error", "Accès refusé."));
            }

            String code = request.get("code");
            String description = request.get("description");

            if (code == null || code.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Le code de la permission est requis"));
            }

            if (description == null || description.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "La description de la permission est requise"));
            }

            // Vérifier le format du code
            if (!code.matches("^[A-Z_]+$")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Le code doit contenir uniquement des lettres majuscules et des underscores"));
            }

            Permission updatedPermission = permissionService.updatePermission(permissionId, code, description);
            return ResponseEntity.ok(updatedPermission);

        } catch (Exception e) {
            logger.error("Erreur lors de la modification de la permission: {}", permissionId, e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Supprimer une permission
     */
    @DeleteMapping("/permissions/{permissionId}")
    public ResponseEntity<?> deletePermission(
            @PathVariable UUID permissionId,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            // Autoriser uniquement SUPERADMIN pour la suppression
            if (!currentUser.getRole().name().equals("SUPERADMIN")) {
                return ResponseEntity.status(403).body(Map.of("error", "Accès refusé. Seul le SUPERADMIN peut supprimer des permissions."));
            }

            permissionService.deletePermission(permissionId);
            return ResponseEntity.ok().body(Map.of("message", "Permission supprimée avec succès"));

        } catch (Exception e) {
            logger.error("Erreur lors de la suppression de la permission: {}", permissionId, e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Récupérer une permission par son ID
     */
    @GetMapping("/permissions/{permissionId}")
    public ResponseEntity<?> getPermissionById(
            @PathVariable UUID permissionId,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            // Autoriser SUPERADMIN et PROPRIETAIRE
            if (!currentUser.getRole().name().equals("SUPERADMIN") &&
                    !currentUser.getRole().name().equals("PROPRIETAIRE")) {
                return ResponseEntity.status(403).body(Map.of("error", "Accès refusé."));
            }

            Permission permission = permissionService.getPermissionById(permissionId);
            return ResponseEntity.ok(permission);

        } catch (Exception e) {
            logger.error("Erreur lors de la récupération de la permission: {}", permissionId, e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    @GetMapping("/utilisateurs/{userId}/permissions")
    public ResponseEntity<?> getUserPermissions(@PathVariable UUID userId, Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);
            Utilisateur targetUser = utilisateurService.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            // Autoriser SUPERADMIN ou PROPRIETAIRE du même atelier
            boolean isAuthorized = currentUser.getRole().name().equals("SUPERADMIN") ||
                    (currentUser.getRole().name().equals("PROPRIETAIRE") &&
                            currentUser.getAtelier() != null &&
                            targetUser.getAtelier() != null &&
                            currentUser.getAtelier().getId().equals(targetUser.getAtelier().getId()));

            if (!isAuthorized) {
                return ResponseEntity.status(403).body(Map.of("error", "Accès refusé."));
            }

            Set<Permission> permissions = permissionService.getUserPermissions(userId);
            return ResponseEntity.ok(permissions);
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des permissions utilisateur", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/utilisateurs/{userId}/permissions")
    public ResponseEntity<?> updateUserPermissions(@PathVariable UUID userId,
                                                   @RequestBody Set<UUID> permissionIds,
                                                   Authentication authentication) {
        try {
            logger.info("Tentative de mise à jour des permissions pour l'utilisateur: {}", userId);

            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            // Autoriser SUPERADMIN ou PROPRIETAIRE du même atelier
            boolean isSuperAdmin = currentUser.getRole() != null &&
                    "SUPERADMIN".equals(currentUser.getRole().name());

            // Vérifier si c'est un propriétaire qui modifie un utilisateur de son atelier
            boolean isProprietaireAuthorized = false;
            if (!isSuperAdmin && "PROPRIETAIRE".equals(currentUser.getRole().name())) {
                Optional<Utilisateur> targetUserOpt = utilisateurService.findById(userId);
                if (targetUserOpt.isPresent()) {
                    Utilisateur targetUser = targetUserOpt.get();
                    isProprietaireAuthorized = currentUser.getAtelier() != null &&
                            targetUser.getAtelier() != null &&
                            currentUser.getAtelier().getId().equals(targetUser.getAtelier().getId());
                }
            }

            if (!isSuperAdmin && !isProprietaireAuthorized) {
                logger.warn("Accès refusé: l'utilisateur {} n'a pas les droits. Rôle: {}",
                        email, currentUser.getRole().name());
                return ResponseEntity.status(403).body(Map.of("error", "Accès refusé."));
            }

            // Vérifier que l'utilisateur cible existe
            if (!utilisateurService.findById(userId).isPresent()) {
                return ResponseEntity.status(404).body(Map.of("error", "Utilisateur non trouvé"));
            }

            permissionService.updateUserPermissions(userId, permissionIds);
            return ResponseEntity.ok().body(Map.of("message", "Permissions mises à jour avec succès"));
        } catch (Exception e) {
            logger.error("Erreur lors de la mise à jour des permissions utilisateur: {}", userId, e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/debug/auth")
    public ResponseEntity<?> debugAuth(Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            Map<String, Object> debugInfo = new HashMap<>();
            debugInfo.put("email", currentUser.getEmail());
            debugInfo.put("role", currentUser.getRole().name());
            debugInfo.put("authorities", authentication.getAuthorities());
            debugInfo.put("authenticated", authentication.isAuthenticated());
            debugInfo.put("atelier", currentUser.getAtelier() != null ? currentUser.getAtelier().getId() : "null");

            return ResponseEntity.ok(debugInfo);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}