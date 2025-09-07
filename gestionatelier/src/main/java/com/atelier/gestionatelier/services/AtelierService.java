package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.dto.AtelierDTO;
import com.atelier.gestionatelier.entities.Atelier;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.repositories.AtelierRepository;
import com.atelier.gestionatelier.repositories.UtilisateurRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.List;
// import java.util.Optional;

@Service
public class AtelierService {

    private final AtelierRepository atelierRepository;
    private final UtilisateurRepository utilisateurRepository;

    public AtelierService(AtelierRepository atelierRepository, 
                         UtilisateurRepository utilisateurRepository) {
        this.atelierRepository = atelierRepository;
        this.utilisateurRepository = utilisateurRepository;
    }

    // Méthode pour récupérer l'utilisateur connecté
    private Utilisateur getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }

    // Méthode pour vérifier les permissions
    private boolean hasAccessToAtelier(Atelier atelier, Utilisateur user) {
        // SuperAdmin a accès à tout
        if ("SUPERADMIN".equals(user.getRole().name())) {
            return true;
        }
        
        // Propriétaire a accès seulement à son atelier
        if ("PROPRIETAIRE".equals(user.getRole().name())) {
            return atelier.getId().equals(user.getAtelier().getId());
        }
        
        // Autres rôles (EMPLOYE, etc.) - ajustez selon vos besoins
        return false;
    }

    public AtelierDTO createAtelier(AtelierDTO atelierDTO) {
        Utilisateur currentUser = getCurrentUser();
        
        // Seul SUPERADMIN peut créer des ateliers
        if (!"SUPERADMIN".equals(currentUser.getRole().name())) {
            throw new IllegalArgumentException("Seul le SuperAdmin peut créer des ateliers");
        }
        
        // [Validation existante...]
        if (atelierDTO.getNom() == null || atelierDTO.getNom().trim().isEmpty()) {
            throw new IllegalArgumentException("Le nom de l'atelier est obligatoire");
        }
        
        // [Reste de la validation...]
        
        Atelier atelier = convertToEntity(atelierDTO);
        Atelier savedAtelier = atelierRepository.save(atelier);
        
        return convertToDTO(savedAtelier);
    }

    public List<AtelierDTO> getAllAteliers() {
        Utilisateur currentUser = getCurrentUser();
        
        if ("SUPERADMIN".equals(currentUser.getRole().name())) {
            // SuperAdmin voit tout
            return atelierRepository.findAll().stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
        } else if ("PROPRIETAIRE".equals(currentUser.getRole().name())) {
            // Propriétaire voit seulement son atelier
            return List.of(convertToDTO(currentUser.getAtelier()));
        } else {
            // Autres rôles - retourner liste vide ou erreur selon vos besoins
            throw new IllegalArgumentException("Accès non autorisé");
        }
    }

    public AtelierDTO getAtelierById(UUID id) {
        Utilisateur currentUser = getCurrentUser();
        Atelier atelier = atelierRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Atelier non trouvé avec l'ID: " + id));
        
        // Vérifier les permissions
        if (!hasAccessToAtelier(atelier, currentUser)) {
            throw new IllegalArgumentException("Accès non autorisé à cet atelier");
        }
        
        return convertToDTO(atelier);
    }

    public AtelierDTO updateAtelier(UUID id, AtelierDTO atelierDTO) {
        Utilisateur currentUser = getCurrentUser();
        Atelier existingAtelier = atelierRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Atelier non trouvé avec l'ID: " + id));
        
        // Vérifier les permissions
        if (!hasAccessToAtelier(existingAtelier, currentUser)) {
            throw new IllegalArgumentException("Accès non autorisé à cet atelier");
        }
        
        // Seul SUPERADMIN peut modifier les ateliers (ou le propriétaire peut modifier le sien si vous le souhaitez)
        if (!"SUPERADMIN".equals(currentUser.getRole().name())) {
            throw new IllegalArgumentException("Seul le SuperAdmin peut modifier les ateliers");
        }
        
        // [Validation et mise à jour existante...]
        
        return convertToDTO(atelierRepository.save(existingAtelier));
    }

    public void deleteAtelier(UUID id) {
        Utilisateur currentUser = getCurrentUser();
        
        // Seul SUPERADMIN peut supprimer des ateliers
        if (!"SUPERADMIN".equals(currentUser.getRole().name())) {
            throw new IllegalArgumentException("Seul le SuperAdmin peut supprimer des ateliers");
        }
        
        Atelier atelier = atelierRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Atelier non trouvé avec l'ID: " + id));
        
        atelierRepository.delete(atelier);
    }

    // [Méthodes convertToEntity et convertToDTO existantes...]
    private Atelier convertToEntity(AtelierDTO dto) {
        Atelier atelier = new Atelier();
        atelier.setNom(dto.getNom());
        atelier.setAdresse(dto.getAdresse());
        atelier.setTelephone(dto.getTelephone());
        
        if (dto.getDateCreation() != null) {
            atelier.setDateCreation(dto.getDateCreation());
        } else {
            atelier.setDateCreation(LocalDateTime.now());
        }
        
        return atelier;
    }

    private AtelierDTO convertToDTO(Atelier atelier) {
        AtelierDTO dto = new AtelierDTO();
        dto.setId(atelier.getId());
        dto.setNom(atelier.getNom());
        dto.setAdresse(atelier.getAdresse());
        dto.setTelephone(atelier.getTelephone());
        dto.setDateCreation(atelier.getDateCreation());
        
        return dto;
    }
}