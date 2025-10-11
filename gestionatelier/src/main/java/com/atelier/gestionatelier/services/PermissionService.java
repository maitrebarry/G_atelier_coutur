package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.entities.Permission;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.repositories.PermissionRepository;
import com.atelier.gestionatelier.repositories.UtilisateurRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
// import java.util.stream.Collectors;

@Service
public class PermissionService {

    private static final Logger logger = LoggerFactory.getLogger(PermissionService.class);
    
    private final PermissionRepository permissionRepository;
    private final UtilisateurRepository utilisateurRepository;

    public PermissionService(PermissionRepository permissionRepository, UtilisateurRepository utilisateurRepository) {
        this.permissionRepository = permissionRepository;
        this.utilisateurRepository = utilisateurRepository;
    }

    public List<Permission> getAllPermissions() {
        return permissionRepository.findAll();
    }

    public Permission createPermission(String code, String description) {
        try {
            logger.info("Tentative de création d'une permission avec le code: {}", code);
            
            if (permissionRepository.existsByCode(code)) {
                String errorMsg = "Une permission avec le code '" + code + "' existe déjà";
                logger.error(errorMsg);
                throw new RuntimeException(errorMsg);
            }
            
            Permission permission = new Permission(code, description);
            Permission savedPermission = permissionRepository.save(permission);
            
            logger.info("Permission créée avec succès: {}", code);
            return savedPermission;
        } catch (Exception e) {
            logger.error("Erreur lors de la création de la permission: {}", code, e);
            throw new RuntimeException("Erreur lors de la création de la permission: " + e.getMessage());
        }
    }



    /**
     * Mettre à jour une permission existante
     */
    @Transactional
    public Permission updatePermission(UUID permissionId, String code, String description) {
        try {
            logger.info("Tentative de modification de la permission: {}", permissionId);

            Permission permission = permissionRepository.findById(permissionId)
                    .orElseThrow(() -> {
                        String errorMsg = "Permission non trouvée avec l'ID: " + permissionId;
                        logger.error(errorMsg);
                        return new RuntimeException(errorMsg);
                    });

            // Vérifier si le code est déjà utilisé par une autre permission
            if (!permission.getCode().equals(code) && permissionRepository.existsByCode(code)) {
                String errorMsg = "Une permission avec le code '" + code + "' existe déjà";
                logger.error(errorMsg);
                throw new RuntimeException(errorMsg);
            }

            // Mettre à jour les champs
            permission.setCode(code);
            permission.setDescription(description);

            Permission updatedPermission = permissionRepository.save(permission);

            logger.info("Permission modifiée avec succès: {} -> {}", permissionId, code);
            return updatedPermission;

        } catch (Exception e) {
            logger.error("Erreur lors de la modification de la permission: {}", permissionId, e);
            throw new RuntimeException("Erreur lors de la modification de la permission: " + e.getMessage());
        }
    }

    /**
     * Supprimer une permission
     */
    @Transactional
    public void deletePermission(UUID permissionId) {
        try {
            logger.info("Tentative de suppression de la permission: {}", permissionId);

            Permission permission = permissionRepository.findById(permissionId)
                    .orElseThrow(() -> {
                        String errorMsg = "Permission non trouvée avec l'ID: " + permissionId;
                        logger.error(errorMsg);
                        return new RuntimeException(errorMsg);
                    });

            // Vérifier si la permission est utilisée par des utilisateurs
            long userCount = utilisateurRepository.countByPermissionsContaining(permission);
            if (userCount > 0) {
                String errorMsg = "Impossible de supprimer la permission '" + permission.getCode() +
                        "' car elle est assignée à " + userCount + " utilisateur(s)";
                logger.error(errorMsg);
                throw new RuntimeException(errorMsg);
            }

            permissionRepository.delete(permission);

            logger.info("Permission supprimée avec succès: {}", permissionId);

        } catch (Exception e) {
            logger.error("Erreur lors de la suppression de la permission: {}", permissionId, e);
            throw new RuntimeException("Erreur lors de la suppression de la permission: " + e.getMessage());
        }
    }

    /**
     * Récupérer une permission par son ID
     */
    public Permission getPermissionById(UUID permissionId) {
        try {
            logger.debug("Récupération de la permission: {}", permissionId);

            return permissionRepository.findById(permissionId)
                    .orElseThrow(() -> {
                        String errorMsg = "Permission non trouvée avec l'ID: " + permissionId;
                        logger.error(errorMsg);
                        return new RuntimeException(errorMsg);
                    });

        } catch (Exception e) {
            logger.error("Erreur lors de la récupération de la permission: {}", permissionId, e);
            throw new RuntimeException("Erreur lors de la récupération de la permission: " + e.getMessage());
        }
    }

    public Set<Permission> getUserPermissions(UUID userId) {
        try {
            logger.debug("Récupération des permissions pour l'utilisateur: {}", userId);
            
            Utilisateur utilisateur = utilisateurRepository.findById(userId)
                    .orElseThrow(() -> {
                        String errorMsg = "Utilisateur non trouvé avec l'ID: " + userId;
                        logger.error(errorMsg);
                        return new RuntimeException(errorMsg);
                    });
            
            return utilisateur.getPermissions();
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des permissions de l'utilisateur: {}", userId, e);
            throw new RuntimeException("Erreur lors de la récupération des permissions: " + e.getMessage());
        }
    }

    @Transactional
    public void updateUserPermissions(UUID userId, Set<UUID> permissionIds) {
        try {
            logger.info("Mise à jour des permissions pour l'utilisateur: {}", userId);
            
            Utilisateur utilisateur = utilisateurRepository.findById(userId)
                    .orElseThrow(() -> {
                        String errorMsg = "Utilisateur non trouvé avec l'ID: " + userId;
                        logger.error(errorMsg);
                        return new RuntimeException(errorMsg);
                    });
            
            Set<Permission> permissions = new HashSet<>();
            for (UUID permissionId : permissionIds) {
                Optional<Permission> permissionOpt = permissionRepository.findById(permissionId);
                if (permissionOpt.isPresent()) {
                    permissions.add(permissionOpt.get());
                } else {
                    logger.warn("Permission non trouvée avec l'ID: {}", permissionId);
                }
            }
            
            utilisateur.setPermissions(permissions);
            utilisateurRepository.save(utilisateur);
            
            logger.info("Permissions mises à jour avec succès pour l'utilisateur: {}", userId);
        } catch (Exception e) {
            logger.error("Erreur lors de la mise à jour des permissions de l'utilisateur: {}", userId, e);
            throw new RuntimeException("Erreur lors de la mise à jour des permissions: " + e.getMessage());
        }
    }

    @Transactional
    public void initializeDefaultPermissions() {
        try {
            logger.info("Début de l'initialisation des permissions par défaut");
            
            // Permissions par défaut
            Map<String, String> defaultPermissions = new LinkedHashMap<>();
            defaultPermissions.put("USER_CREATE", "Créer un utilisateur");
            defaultPermissions.put("USER_UPDATE", "Modifier un utilisateur");
            defaultPermissions.put("USER_DELETE", "Supprimer un utilisateur");
            defaultPermissions.put("USER_VIEW", "Voir les utilisateurs");
            
            defaultPermissions.put("CLIENT_CREATE", "Créer un client");
            defaultPermissions.put("CLIENT_UPDATE", "Modifier un client");
            defaultPermissions.put("CLIENT_DELETE", "Supprimer un client");
            defaultPermissions.put("CLIENT_VIEW", "Voir les clients");
            
            defaultPermissions.put("ATELIER_CREATE", "Créer un atelier");
            defaultPermissions.put("ATELIER_UPDATE", "Modifier un atelier");
            defaultPermissions.put("ATELIER_DELETE", "Supprimer un atelier");
            defaultPermissions.put("ATELIER_VIEW", "Voir les ateliers");

            defaultPermissions.put("ACCESS_DASHBOARD", "Accéder au tableau de bord");
            defaultPermissions.put("ACCESS_REPORTS", "Accéder aux rapports");
            defaultPermissions.put("EXPORT_DATA", "Exporter des données");
            defaultPermissions.put("IMPORT_DATA", "Importer des données");

            int count = 0;
            for (Map.Entry<String, String> entry : defaultPermissions.entrySet()) {
                if (!permissionRepository.existsByCode(entry.getKey())) {
                    Permission permission = new Permission(entry.getKey(), entry.getValue());
                    permissionRepository.save(permission);
                    count++;
                    logger.debug("Permission par défaut créée: {}", entry.getKey());
                }
            }
            
            logger.info("Initialisation des permissions par défaut terminée. {} nouvelles permissions créées.", count);
        } catch (Exception e) {
            logger.error("Erreur lors de l'initialisation des permissions par défaut", e);
            throw new RuntimeException("Erreur lors de l'initialisation des permissions par défaut: " + e.getMessage());
        }
    }

    public Permission createCustomPermission(String code, String description) {
        try {
            logger.info("Tentative de création d'une permission personnalisée avec le code: {}", code);
            
            // Validation du format du code
            if (!code.matches("^[A-Z_]+$")) {
                String errorMsg = "Le code de permission doit contenir uniquement des lettres majuscules et des underscores";
                logger.error(errorMsg);
                throw new RuntimeException(errorMsg);
            }
            
            if (permissionRepository.existsByCode(code)) {
                String errorMsg = "Une permission avec le code '" + code + "' existe déjà";
                logger.error(errorMsg);
                throw new RuntimeException(errorMsg);
            }
            
            Permission permission = new Permission(code, description);
            Permission savedPermission = permissionRepository.save(permission);
            
            logger.info("Permission personnalisée créée avec succès: {}", code);
            return savedPermission;
        } catch (Exception e) {
            logger.error("Erreur lors de la création de la permission personnalisée: {}", code, e);
            throw new RuntimeException("Erreur lors de la création de la permission personnalisée: " + e.getMessage());
        }
    }

    public boolean canModifyPermissions(Utilisateur currentUser, Utilisateur targetUser) {
        // Le SUPERADMIN peut modifier les permissions de tout le monde
        if (currentUser.getRole().name().equals("SUPERADMIN")) {
            return true;
        }
        
        // Un propriétaire peut modifier les permissions des utilisateurs de son atelier
        // mais pas celles d'autres propriétaires ou du SUPERADMIN
        if (currentUser.getRole().name().equals("PROPRIETAIRE")) {
            return targetUser.getAtelier() != null && 
                   targetUser.getAtelier().getId().equals(currentUser.getAtelier().getId()) &&
                   !targetUser.getRole().name().equals("SUPERADMIN") &&
                   !targetUser.getRole().name().equals("PROPRIETAIRE");
        }
        
        // Les autres rôles ne peuvent modifier aucune permission
        return false;
    }
}