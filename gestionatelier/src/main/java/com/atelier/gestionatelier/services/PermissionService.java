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

            // Permissions par défaut en FRANÇAIS
            Map<String, String> defaultPermissions = new LinkedHashMap<>();

            // Permissions pour la Sidebar - Visibilité des menus
//            defaultPermissions.put("MENU_TABLEAU_BORD", "Accéder au tableau de bord");
//            defaultPermissions.put("MENU_ATELIERS", "Voir le menu ateliers");
//            defaultPermissions.put("MENU_UTILISATEURS", "Voir le menu utilisateurs");
//            defaultPermissions.put("MENU_MODELES", "Voir le menu modèles");
//            defaultPermissions.put("MENU_AFFECTATIONS", "Voir le menu affectations");
//            defaultPermissions.put("MENU_RENDEZ_VOUS", "Voir le menu rendez-vous");
//            defaultPermissions.put("MENU_PAIEMENTS", "Voir le menu paiements");
//            defaultPermissions.put("MENU_PARAMETRES", "Voir le menu paramètres");
            // Permissions CRUD Utilisateurs
            defaultPermissions.put("UTILISATEUR_VOIR", "Voir les utilisateurs");
            defaultPermissions.put("UTILISATEUR_CREER", "Créer un utilisateur");
            defaultPermissions.put("UTILISATEUR_MODIFIER", "Modifier un utilisateur");
            defaultPermissions.put("UTILISATEUR_SUPPRIMER", "Supprimer un utilisateur");

            // Permissions CRUD Clients
            defaultPermissions.put("CLIENT_VOIR", "Voir les clients");
            defaultPermissions.put("CLIENT_CREER", "Créer un client");
            defaultPermissions.put("CLIENT_MODIFIER", "Modifier un client");
            defaultPermissions.put("CLIENT_SUPPRIMER", "Supprimer un client");

            // Permissions CRUD Ateliers
            defaultPermissions.put("ATELIER_VOIR", "Voir les ateliers");
            defaultPermissions.put("ATELIER_CREER", "Créer un atelier");
            defaultPermissions.put("ATELIER_MODIFIER", "Modifier un atelier");
            defaultPermissions.put("ATELIER_SUPPRIMER", "Supprimer un atelier");

            // Permissions CRUD Modèles
            defaultPermissions.put("MODELE_VOIR", "Voir les modèles");
            defaultPermissions.put("MODELE_CREER", "Créer un modèle");
            defaultPermissions.put("MODELE_MODIFIER", "Modifier un modèle");
            defaultPermissions.put("MODELE_SUPPRIMER", "Supprimer un modèle");

            // Permissions CRUD Affectations
            defaultPermissions.put("AFFECTATION_VOIR", "Voir les affectations");
            defaultPermissions.put("AFFECTATION_CREER", "Créer une affectation");
            defaultPermissions.put("AFFECTATION_MODIFIER", "Modifier une affectation");
            defaultPermissions.put("AFFECTATION_SUPPRIMER", "Supprimer une affectation");

            // Permissions CRUD Rendez-vous
            defaultPermissions.put("RENDEZ_VOUS_VOIR", "Voir les rendez-vous");
            defaultPermissions.put("RENDEZ_VOUS_CREER", "Créer un rendez-vous");
            defaultPermissions.put("RENDEZ_VOUS_MODIFIER", "Modifier un rendez-vous");
            defaultPermissions.put("RENDEZ_VOUS_SUPPRIMER", "Supprimer un rendez-vous");

            // Permissions CRUD Paiements
            defaultPermissions.put("PAIEMENT_VOIR", "Voir les paiements");
            defaultPermissions.put("PAIEMENT_CREER", "Créer un paiement");
            defaultPermissions.put("PAIEMENT_MODIFIER", "Modifier un paiement");
            defaultPermissions.put("PAIEMENT_SUPPRIMER", "Supprimer un paiement");

            // Permissions Spéciales
            defaultPermissions.put("MENU_PARAMETRES", "voir le parametre");
//            defaultPermissions.put("IMPORTER_DONNEES", "Importer des données");
//            defaultPermissions.put("GENERER_RAPPORT", "Générer des rapports");
//            defaultPermissions.put("VOIR_STATISTIQUES", "Voir les statistiques");

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

    // Dans votre PermissionService.java

    public Map<String, Boolean> getUserPermissionsMap(UUID userId) {
        try {
            logger.debug("Récupération des permissions map pour l'utilisateur: {}", userId);

            Utilisateur utilisateur = utilisateurRepository.findById(userId)
                    .orElseThrow(() -> {
                        String errorMsg = "Utilisateur non trouvé avec l'ID: " + userId;
                        logger.error(errorMsg);
                        return new RuntimeException(errorMsg);
                    });

            Set<String> userPermissionCodes = utilisateur.getPermissionCodes();

            // Créer un map avec toutes les permissions disponibles en FRANÇAIS
            Map<String, Boolean> permissionsMap = new HashMap<>();

            // Permissions Sidebar - Visibilité des menus (correspondant à votre frontend)
            permissionsMap.put("MENU_MESURES", userPermissionCodes.contains("CLIENT_VIEW"));
            permissionsMap.put("MENU_CLIENTS", userPermissionCodes.contains("CLIENT_VIEW"));
            permissionsMap.put("MENU_MODELES", userPermissionCodes.contains("MODELE_VIEW"));
            permissionsMap.put("MENU_AFFECTATIONS", userPermissionCodes.contains("AFFECTATION_VIEW"));
            permissionsMap.put("MENU_RENDEZ_VOUS", userPermissionCodes.contains("RENDEZVOUS_VIEW"));
            permissionsMap.put("MENU_PAIEMENTS", userPermissionCodes.contains("PAIEMENT_VIEW"));
            permissionsMap.put("MENU_PARAMETRES", userPermissionCodes.contains("PARAMETRES_VIEW"));

            // Permissions Boutons - Actions
            permissionsMap.put("BTN_CREER_CLIENT", userPermissionCodes.contains("CLIENT_CREATE"));
            permissionsMap.put("BTN_MODIFIER_CLIENT", userPermissionCodes.contains("CLIENT_UPDATE"));
            permissionsMap.put("BTN_SUPPRIMER_CLIENT", userPermissionCodes.contains("CLIENT_DELETE"));

            permissionsMap.put("BTN_CREER_MODELE", userPermissionCodes.contains("MODELE_CREATE"));
            permissionsMap.put("BTN_MODIFIER_MODELE", userPermissionCodes.contains("MODELE_UPDATE"));
            permissionsMap.put("BTN_SUPPRIMER_MODELE", userPermissionCodes.contains("MODELE_DELETE"));

            permissionsMap.put("BTN_CREER_AFFECTATION", userPermissionCodes.contains("AFFECTATION_CREATE"));
            permissionsMap.put("BTN_MODIFIER_AFFECTATION", userPermissionCodes.contains("AFFECTATION_UPDATE"));
            permissionsMap.put("BTN_SUPPRIMER_AFFECTATION", userPermissionCodes.contains("AFFECTATION_DELETE"));

            permissionsMap.put("BTN_CREER_RENDEZVOUS", userPermissionCodes.contains("RENDEZVOUS_CREATE"));
            permissionsMap.put("BTN_MODIFIER_RENDEZVOUS", userPermissionCodes.contains("RENDEZVOUS_UPDATE"));
            permissionsMap.put("BTN_SUPPRIMER_RENDEZVOUS", userPermissionCodes.contains("RENDEZVOUS_DELETE"));

            permissionsMap.put("BTN_CREER_PAIEMENT", userPermissionCodes.contains("PAIEMENT_CREATE"));
            permissionsMap.put("BTN_MODIFIER_PAIEMENT", userPermissionCodes.contains("PAIEMENT_UPDATE"));
            permissionsMap.put("BTN_SUPPRIMER_PAIEMENT", userPermissionCodes.contains("PAIEMENT_DELETE"));

            return permissionsMap;
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des permissions map de l'utilisateur: {}", userId, e);
            throw new RuntimeException("Erreur lors de la récupération des permissions map: " + e.getMessage());
        }
    }

    public boolean userHasPermission(UUID userId, String permissionCode) {
        try {
            Set<Permission> userPermissions = getUserPermissions(userId);
            return userPermissions.stream()
                    .anyMatch(permission -> permission.getCode().equals(permissionCode));
        } catch (Exception e) {
            logger.error("Erreur lors de la vérification de la permission: {} pour l'utilisateur: {}", permissionCode, userId, e);
            return false;
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