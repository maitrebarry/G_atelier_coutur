package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.dto.CreateModeleDTO;
import com.atelier.gestionatelier.dto.ModeleDTO;
import com.atelier.gestionatelier.dto.ModeleListDTO;
import com.atelier.gestionatelier.dto.UpdateModeleDTO;
import com.atelier.gestionatelier.entities.Atelier;
import com.atelier.gestionatelier.entities.Modele;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.mapper.ModeleMapper;
import com.atelier.gestionatelier.repositories.AtelierRepository;
import com.atelier.gestionatelier.repositories.ModeleRepository;
import com.atelier.gestionatelier.repositories.UtilisateurRepository;
import com.atelier.gestionatelier.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModeleService {

    private final ModeleRepository modeleRepository;
    private final AtelierRepository atelierRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final ModeleMapper modeleMapper;
    private final FileStorageService fileStorageService;

    private static final long MAX_PHOTO_SIZE = 5 * 1024 * 1024;

    // ==================== MÉTHODES AVEC PERMISSIONS ====================

    public ModeleDTO creerModeleWithPermissions(CreateModeleDTO dto, MultipartFile photoFile, String emailCurrentUser) throws Exception {
        Utilisateur currentUser = utilisateurRepository.findByEmail(emailCurrentUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Vérifier les permissions de création
        if (!hasCreatePermission(currentUser, dto.getAtelierId())) {
            throw new Exception("Permission refusée pour créer un modèle");
        }

        return creerModele(dto, photoFile);
    }

    public List<ModeleListDTO> getModelesByAtelierWithPermissions(UUID atelierId, String emailCurrentUser) throws Exception {
        Utilisateur currentUser = utilisateurRepository.findByEmail(emailCurrentUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Vérifier les permissions de lecture
        if (!hasReadPermission(currentUser, atelierId)) {
            throw new Exception("Permission refusée pour voir les modèles");
        }

        return getModelesByAtelier(atelierId);
    }

    public ModeleDTO getModeleByIdWithPermissions(UUID id, UUID atelierId, String emailCurrentUser) throws Exception {
        Utilisateur currentUser = utilisateurRepository.findByEmail(emailCurrentUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Vérifier les permissions de lecture
        if (!hasReadPermission(currentUser, atelierId)) {
            throw new Exception("Permission refusée pour voir ce modèle");
        }

        return getModeleById(id, atelierId);
    }

    public ModeleDTO updateModeleWithPermissions(UUID id, UUID atelierId, UpdateModeleDTO dto, MultipartFile nouvellePhoto, String emailCurrentUser) throws Exception {
        Utilisateur currentUser = utilisateurRepository.findByEmail(emailCurrentUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Vérifier les permissions de modification
        if (!hasUpdatePermission(currentUser, atelierId)) {
            throw new Exception("Permission refusée pour modifier ce modèle");
        }

        return updateModele(id, atelierId, dto, nouvellePhoto);
    }

    public void deleteModeleWithPermissions(UUID id, UUID atelierId, String emailCurrentUser) throws Exception {
        Utilisateur currentUser = utilisateurRepository.findByEmail(emailCurrentUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Vérifier les permissions de suppression
        if (!hasDeletePermission(currentUser, atelierId)) {
            throw new Exception("Permission refusée pour supprimer ce modèle");
        }

        deleteModele(id, atelierId);
    }

    public List<ModeleListDTO> searchModelesWithPermissions(UUID atelierId, String searchTerm, String emailCurrentUser) throws Exception {
        Utilisateur currentUser = utilisateurRepository.findByEmail(emailCurrentUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Vérifier les permissions de lecture
        if (!hasReadPermission(currentUser, atelierId)) {
            throw new Exception("Permission refusée pour rechercher des modèles");
        }

        return searchModeles(atelierId, searchTerm);
    }

    // ==================== MÉTHODES DE PERMISSIONS ====================

    private boolean hasCreatePermission(Utilisateur currentUser, UUID atelierId) {
        // SUPERADMIN peut créer partout
        if (Role.SUPERADMIN.equals(currentUser.getRole())) {
            return true;
        }

        // PROPRIETAIRE, SECRETAIRE, TAILLEUR peuvent créer dans leur atelier
        if (List.of(Role.PROPRIETAIRE, Role.SECRETAIRE, Role.TAILLEUR).contains(currentUser.getRole())) {
            // ✅ CORRECTION : Vérifier si l'atelier de l'utilisateur correspond
            return currentUser.getAtelier() != null && currentUser.getAtelier().getId().equals(atelierId);
        }

        return false;
    }

    private boolean hasReadPermission(Utilisateur currentUser, UUID atelierId) {
        // SUPERADMIN peut tout voir
        if (Role.SUPERADMIN.equals(currentUser.getRole())) {
            return true;
        }

        // PROPRIETAIRE, SECRETAIRE, TAILLEUR peuvent voir leur atelier
        if (List.of(Role.PROPRIETAIRE, Role.SECRETAIRE, Role.TAILLEUR).contains(currentUser.getRole())) {
            return currentUser.getAtelier() != null && currentUser.getAtelier().getId().equals(atelierId);
        }

        return false;
    }

    private boolean hasUpdatePermission(Utilisateur currentUser, UUID atelierId) {
        // SUPERADMIN peut tout modifier
        if (Role.SUPERADMIN.equals(currentUser.getRole())) {
            return true;
        }

        // PROPRIETAIRE et SECRETAIRE peuvent modifier dans leur atelier
        if (List.of(Role.PROPRIETAIRE, Role.SECRETAIRE).contains(currentUser.getRole())) {
            return currentUser.getAtelier() != null && currentUser.getAtelier().getId().equals(atelierId);
        }

        return false;
    }

    private boolean hasDeletePermission(Utilisateur currentUser, UUID atelierId) {
        // SUPERADMIN peut tout supprimer
        if (Role.SUPERADMIN.equals(currentUser.getRole())) {
            return true;
        }

        // PROPRIETAIRE peut supprimer dans son atelier
        if (Role.PROPRIETAIRE.equals(currentUser.getRole())) {
            return currentUser.getAtelier() != null && currentUser.getAtelier().getId().equals(atelierId);
        }

        return false;
    }

    // ==================== MÉTHODES ORIGINALES (INTERNES) ====================

//    @Transactional
//    public ModeleDTO creerModele(CreateModeleDTO dto, MultipartFile photoFile) throws Exception {
//        System.out.println("=== DÉBUT CRÉATION MODÈLE ===");
//        System.out.println("📝 Données reçues: " + dto.toString());
//
//        // Valider l'atelier
//        Atelier atelier = atelierRepository.findById(dto.getAtelierId())
//                .orElseThrow(() -> new IllegalArgumentException("Atelier non trouvé"));
//
//        // Vérifier les doublons de nom
//        System.out.println("🔍 Vérification doublon - Nom: " + dto.getNom() + ", Atelier: " + atelier.getId());
//        if (modeleRepository.existsByNomAndAtelierId(dto.getNom(), atelier.getId())) {
//            System.out.println("❌ DOUBLON DÉTECTÉ - Modèle existe déjà");
//            throw new IllegalArgumentException("Un modèle avec ce nom existe déjà dans cet atelier");
//        }
//        System.out.println("✅ Aucun doublon détecté");
//
//        // Gérer l'upload de la photo
//        String photoPath = null;
//        if (photoFile != null && !photoFile.isEmpty()) {
//            try {
//                // Valider que c'est une image
//                if (!fileStorageService.isImageFile(photoFile)) {
//                    throw new IllegalArgumentException("Le fichier doit être une image");
//                }
//
//                // Valider la taille
//                fileStorageService.validateFileSize(photoFile, MAX_PHOTO_SIZE);
//
//                // Sauvegarder la photo
//                photoPath = fileStorageService.storeFile(photoFile, "model_photo");
//
//            } catch (IOException e) {
//                throw new IllegalArgumentException("Erreur lors de l'upload de la photo: " + e.getMessage());
//            }
//        }
//
//        // Créer le modèle
//        Modele modele = modeleMapper.toEntity(dto);
//        modele.setPhotoPath(photoPath);
//
//        Modele savedModele = modeleRepository.save(modele);
//
//        return modeleMapper.toDTO(savedModele);
//    }

    @Transactional
    public ModeleDTO creerModele(CreateModeleDTO dto, MultipartFile photoFile) throws Exception {
        System.out.println("=== DÉBUT CRÉATION MODÈLE ===");
        System.out.println("📝 Données reçues: " + dto.toString());

        // Valider l'atelier
        Atelier atelier = atelierRepository.findById(dto.getAtelierId())
                .orElseThrow(() -> new IllegalArgumentException("Atelier non trouvé"));

        // ✅ SUPPRIMER la vérification des doublons - permettre plusieurs modèles avec le même nom
        // if (modeleRepository.existsByNomAndAtelierId(dto.getNom(), atelier.getId())) {
        //     System.out.println("❌ DOUBLON DÉTECTÉ - Modèle existe déjà");
        //     throw new IllegalArgumentException("Un modèle avec ce nom existe déjà dans cet atelier");
        // }
        System.out.println("✅ Vérification doublon désactivée");

        // Gérer l'upload de la photo
        String photoPath = null;
        if (photoFile != null && !photoFile.isEmpty()) {
            try {
                // Valider que c'est une image
                if (!fileStorageService.isImageFile(photoFile)) {
                    throw new IllegalArgumentException("Le fichier doit être une image");
                }

                // Valider la taille
                fileStorageService.validateFileSize(photoFile, MAX_PHOTO_SIZE);

                // Sauvegarder la photo
                photoPath = fileStorageService.storeFile(photoFile, "model_photo");

            } catch (IOException e) {
                throw new IllegalArgumentException("Erreur lors de l'upload de la photo: " + e.getMessage());
            }
        }

        // Créer le modèle
        Modele modele = modeleMapper.toEntity(dto);
        modele.setPhotoPath(photoPath);

        Modele savedModele = modeleRepository.save(modele);

        return modeleMapper.toDTO(savedModele);
    }

    @Transactional(readOnly = true)
    public List<ModeleListDTO> getModelesByAtelier(UUID atelierId) {
        // Valider l'atelier
        if (!atelierRepository.existsById(atelierId)) {
            throw new IllegalArgumentException("Atelier non trouvé");
        }

        List<Modele> modeles = modeleRepository.findByAtelierIdAndEstActifTrueOrderByDateCreationDesc(atelierId);

        return modeles.stream()
                .map(modeleMapper::toListDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ModeleListDTO> getModelesByCategorie(UUID atelierId, Modele.CategorieModele categorie) {
        List<Modele> modeles = modeleRepository.findByAtelierIdAndCategorieAndEstActifTrueOrderByDateCreationDesc(atelierId, categorie);

        return modeles.stream()
                .map(modeleMapper::toListDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ModeleListDTO> searchModeles(UUID atelierId, String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return getModelesByAtelier(atelierId);
        }

        List<Modele> modeles = modeleRepository.searchByNom(atelierId, searchTerm.trim());

        return modeles.stream()
                .map(modeleMapper::toListDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ModeleDTO getModeleById(UUID id, UUID atelierId) {
        Modele modele = modeleRepository.findByIdAndAtelierId(id, atelierId)
                .orElseThrow(() -> new IllegalArgumentException("Modèle non trouvé"));

        return modeleMapper.toDTO(modele);
    }

//    @Transactional
//    public ModeleDTO updateModele(UUID id, UUID atelierId, UpdateModeleDTO dto, MultipartFile nouvellePhoto) throws Exception {
//        Modele modele = modeleRepository.findByIdAndAtelierId(id, atelierId)
//                .orElseThrow(() -> new IllegalArgumentException("Modèle non trouvé"));
//
//        // Vérifier les doublons de nom (si le nom est modifié)
////        if (dto.getNom() != null && !dto.getNom().equals(modele.getNom())) {
////            if (modeleRepository.existsByNomAndAtelierId(dto.getNom(), atelierId)) {
////                throw new IllegalArgumentException("Un modèle avec ce nom existe déjà");
////            }
////        }
//
//        // Gérer la nouvelle photo si fournie
//        if (nouvellePhoto != null && !nouvellePhoto.isEmpty()) {
//            try {
//                // Valider la nouvelle photo
//                if (!fileStorageService.isImageFile(nouvellePhoto)) {
//                    throw new IllegalArgumentException("Le fichier doit être une image");
//                }
//                fileStorageService.validateFileSize(nouvellePhoto, MAX_PHOTO_SIZE);
//
//                // Supprimer l'ancienne photo si elle existe
//                if (modele.getPhotoPath() != null) {
//                    fileStorageService.deleteFile(modele.getPhotoPath(), "model_photo");
//                }
//
//                // Sauvegarder la nouvelle photo
//                String nouvellePhotoPath = fileStorageService.storeFile(nouvellePhoto, "model_photo");
//                modele.setPhotoPath(nouvellePhotoPath);
//
//            } catch (IOException e) {
//                throw new IllegalArgumentException("Erreur lors de l'upload de la nouvelle photo: " + e.getMessage());
//            }
//        }
//
//        // Mettre à jour les autres champs
//        modeleMapper.updateEntityFromDTO(dto, modele);
//
//        Modele updatedModele = modeleRepository.save(modele);
//
//        return modeleMapper.toDTO(updatedModele);
//    }
@Transactional
public ModeleDTO updateModele(UUID id, UUID atelierId, UpdateModeleDTO dto, MultipartFile nouvellePhoto) throws Exception {
    Modele modele = modeleRepository.findByIdAndAtelierId(id, atelierId)
            .orElseThrow(() -> new IllegalArgumentException("Modèle non trouvé"));

    System.out.println("=== DÉBUT MODIFICATION MODÈLE ===");
    System.out.println("📝 Modèle à modifier: " + modele.getNom() + " (ID: " + modele.getId() + ")");
    System.out.println("🔄 Nouvelles données: " + dto.toString());

    // ✅ SUPPRIMER la vérification des doublons en modification aussi
    // if (dto.getNom() != null && !dto.getNom().equals(modele.getNom())) {
    //     if (modeleRepository.existsByNomAndAtelierId(dto.getNom(), atelierId)) {
    //         throw new IllegalArgumentException("Un modèle avec ce nom existe déjà");
    //     }
    // }

    // Gérer la nouvelle photo si fournie
    if (nouvellePhoto != null && !nouvellePhoto.isEmpty()) {
        try {
            // Valider la nouvelle photo
            if (!fileStorageService.isImageFile(nouvellePhoto)) {
                throw new IllegalArgumentException("Le fichier doit être une image");
            }
            fileStorageService.validateFileSize(nouvellePhoto, MAX_PHOTO_SIZE);

            // Supprimer l'ancienne photo si elle existe
            if (modele.getPhotoPath() != null) {
                fileStorageService.deleteFile(modele.getPhotoPath(), "model_photo");
            }

            // Sauvegarder la nouvelle photo
            String nouvellePhotoPath = fileStorageService.storeFile(nouvellePhoto, "model_photo");
            modele.setPhotoPath(nouvellePhotoPath);

        } catch (IOException e) {
            throw new IllegalArgumentException("Erreur lors de l'upload de la nouvelle photo: " + e.getMessage());
        }
    }

    // Mettre à jour les autres champs
    modeleMapper.updateEntityFromDTO(dto, modele);

    Modele updatedModele = modeleRepository.save(modele);

    return modeleMapper.toDTO(updatedModele);
}
    @Transactional
    public void deleteModele(UUID id, UUID atelierId) throws Exception {
        Modele modele = modeleRepository.findByIdAndAtelierId(id, atelierId)
                .orElseThrow(() -> new IllegalArgumentException("Modèle non trouvé"));

        // ✅ VÉRIFIER SI LE MODÈLE EST LIÉ À DES CLIENTS
        boolean estUtiliseParClients = estModeleUtiliseParClients(modele);

        if (estUtiliseParClients) {
            // Soft delete si utilisé par des clients
            modele.setEstActif(false);
            modeleRepository.save(modele);
            System.out.println("🔄 Modèle désactivé (utilisé par des clients)");
        } else {
            // ✅ SUPPRESSION COMPLÈTE si non utilisé
            // 1. Supprimer la photo si elle existe
            if (modele.getPhotoPath() != null) {
                boolean photoSupprimee = fileStorageService.deleteFile(modele.getPhotoPath(), "model_photo");
                if (photoSupprimee) {
                    System.out.println("🗑️ Photo supprimée: " + modele.getPhotoPath());
                }
            }

            // 2. Supprimer le modèle de la base de données
            modeleRepository.delete(modele);
            System.out.println("✅ Modèle supprimé complètement de la base");
        }
    }

    // ✅ MÉTHODE POUR VÉRIFIER SI LE MODÈLE EST UTILISÉ
    private boolean estModeleUtiliseParClients(Modele modele) {
        // Ici vous devrez vérifier si ce modèle est référencé dans les mesures des clients
        // Pour l'instant, on retourne false - à implémenter plus tard
        // Exemple: return mesureRepository.existsByModeleId(modele.getId());
        return false; // Temporaire - à adapter
    }

    @Transactional
    public void activateModele(UUID id, UUID atelierId) {
        Modele modele = modeleRepository.findByIdAndAtelierId(id, atelierId)
                .orElseThrow(() -> new IllegalArgumentException("Modèle non trouvé"));

        modele.setEstActif(true);
        modeleRepository.save(modele);
    }

    @Transactional
    public void deactivateModele(UUID id, UUID atelierId) {
        Modele modele = modeleRepository.findByIdAndAtelierId(id, atelierId)
                .orElseThrow(() -> new IllegalArgumentException("Modèle non trouvé"));

        modele.setEstActif(false);
        modeleRepository.save(modele);
    }

    @Transactional(readOnly = true)
    public long countModelesActifs(UUID atelierId) {
        return modeleRepository.countByAtelierIdAndEstActifTrue(atelierId);
    }
}