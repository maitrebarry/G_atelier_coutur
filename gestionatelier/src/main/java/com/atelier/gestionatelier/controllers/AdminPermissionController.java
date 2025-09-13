package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.entities.Permission;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.services.PermissionService;
import com.atelier.gestionatelier.services.UtilisateurService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
// import org.springframework.security.access.prepost.PreAuthorize;
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
            // Vérifier que l'utilisateur est SUPERADMIN
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);
            
            if (!currentUser.getRole().name().equals("SUPERADMIN")) {
                return ResponseEntity.status(403).body(Map.of("error", "Accès refusé. Seul le SUPERADMIN peut accéder à cette ressource."));
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
            // Vérifier que l'utilisateur est SUPERADMIN
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);
            
            if (!currentUser.getRole().name().equals("SUPERADMIN")) {
                return ResponseEntity.status(403).body(Map.of("error", "Accès refusé. Seul le SUPERADMIN peut créer des permissions."));
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

    @GetMapping("/utilisateurs/{userId}/permissions")
    public ResponseEntity<?> getUserPermissions(@PathVariable UUID userId, Authentication authentication) {
        try {
            // Vérifier que l'utilisateur a le droit de voir ces permissions
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);
            Utilisateur targetUser = utilisateurService.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            
            // Seul le SUPERADMIN ou le propriétaire de l'atelier peut voir les permissions
            if (!currentUser.getRole().name().equals("SUPERADMIN") && 
                !(currentUser.getRole().name().equals("PROPRIETAIRE") && 
                  currentUser.getAtelier() != null &&
                  targetUser.getAtelier() != null &&
                  currentUser.getAtelier().getId().equals(targetUser.getAtelier().getId()))) {
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
        logger.info("Email de l'utilisateur connecté: {}", email);
        
        Utilisateur currentUser = utilisateurService.findByEmail(email);
        logger.info("Rôle de l'utilisateur connecté: {}", currentUser.getRole().name());
        
        // Vérification plus robuste du rôle
        boolean isSuperAdmin = currentUser.getRole() != null && 
                              "SUPERADMIN".equals(currentUser.getRole().name());
        
        logger.info("Est SUPERADMIN: {}", isSuperAdmin);
        logger.info("Autorités de l'utilisateur: {}", authentication.getAuthorities());
        
        if (!isSuperAdmin) {
            logger.warn("Accès refusé: l'utilisateur {} n'est pas SUPERADMIN. Rôle actuel: {}", 
                       email, currentUser.getRole() != null ? currentUser.getRole().name() : "N/A");
            return ResponseEntity.status(403).body(Map.of("error", "Accès refusé. Seul le SUPERADMIN peut modifier les permissions."));
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
        
        return ResponseEntity.ok(debugInfo);
    } catch (Exception e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
}