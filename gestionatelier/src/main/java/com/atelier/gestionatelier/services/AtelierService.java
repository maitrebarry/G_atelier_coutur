package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.dto.AtelierDTO;
import com.atelier.gestionatelier.entities.Atelier;
import com.atelier.gestionatelier.repositories.AtelierRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.List;


@Service
public class AtelierService {

    private final AtelierRepository atelierRepository;

    public AtelierService(AtelierRepository atelierRepository) {
        this.atelierRepository = atelierRepository;
    }

    public AtelierDTO createAtelier(AtelierDTO atelierDTO) {
        // Validation
        if (atelierDTO.getNom() == null || atelierDTO.getNom().trim().isEmpty()) {
            throw new IllegalArgumentException("Le nom de l'atelier est obligatoire");
        }
        
        if (atelierDTO.getAdresse() == null || atelierDTO.getAdresse().trim().isEmpty()) {
            throw new IllegalArgumentException("L'adresse de l'atelier est obligatoire");
        }
        
        if (atelierDTO.getTelephone() == null || atelierDTO.getTelephone().trim().isEmpty()) {
            throw new IllegalArgumentException("Le téléphone de l'atelier est obligatoire");
        }

        // Vérification des doublons
        if (atelierRepository.existsByNom(atelierDTO.getNom())) {
            throw new IllegalArgumentException("Un atelier avec ce nom existe déjà");
        }

        if (atelierRepository.existsByTelephone(atelierDTO.getTelephone())) {
            throw new IllegalArgumentException("Ce numéro de téléphone est déjà utilisé");
        }
        if (atelierRepository.existsTelephoneWithMoreThan8Digits()) {
            throw new IllegalArgumentException("Le numéro de téléphone ne doit pas dépasser 8 chiffres");
        }

        // Conversion DTO → Entity
        Atelier atelier = convertToEntity(atelierDTO);
        
        // Sauvegarde
        Atelier savedAtelier = atelierRepository.save(atelier);
        
        // Conversion Entity → DTO
        return convertToDTO(savedAtelier);
    }

    private Atelier convertToEntity(AtelierDTO dto) {
        Atelier atelier = new Atelier();
        atelier.setNom(dto.getNom());
        atelier.setAdresse(dto.getAdresse());
        atelier.setTelephone(dto.getTelephone());
        
        // Gestion de la date de création
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


    public List<AtelierDTO> getAllAteliers() {
        List<Atelier> ateliers = atelierRepository.findAll();
        
        // Convertir la liste d'entités en liste de DTOs
        return ateliers.stream()
                .map(this::convertToDTO) 
                .collect(Collectors.toList());
    }

    public AtelierDTO getAtelierById(UUID id) {
        // Trouver l'atelier par ID
        Atelier atelier = atelierRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Atelier non trouvé avec l'ID: " + id));
        
        // Convertir en DTO
        return convertToDTO(atelier);
    }

    public AtelierDTO updateAtelier(UUID id, AtelierDTO atelierDTO) {
        // Vérifier que l'atelier existe
        Atelier existingAtelier = atelierRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Atelier non trouvé avec l'ID: " + id));

        // Validation
        if (atelierDTO.getNom() == null || atelierDTO.getNom().trim().isEmpty()) {
            throw new IllegalArgumentException("Le nom de l'atelier est obligatoire");
        }
        
        // Vérifier les doublons UNIQUEMENT si le nom a changé
        if (!existingAtelier.getNom().equals(atelierDTO.getNom())) {
            if (atelierRepository.existsByNom(atelierDTO.getNom())) {
                throw new IllegalArgumentException("Un atelier avec ce nom existe déjà");
            }
        }

        // Vérifier les doublons UNIQUEMENT si le téléphone a changé
        if (!existingAtelier.getTelephone().equals(atelierDTO.getTelephone())) {
            if (atelierRepository.existsByTelephone(atelierDTO.getTelephone())) {
                throw new IllegalArgumentException("Ce numéro de téléphone est déjà utilisé");
            }
            
            // Validation de la longueur du téléphone
            if (atelierDTO.getTelephone().length() > 8) {
                throw new IllegalArgumentException("Le numéro de téléphone ne doit pas dépasser 8 chiffres");
            }
        }

        // Mettre à jour les champs
        existingAtelier.setNom(atelierDTO.getNom());
        existingAtelier.setAdresse(atelierDTO.getAdresse());
        existingAtelier.setTelephone(atelierDTO.getTelephone());
        
        if (atelierDTO.getDateCreation() != null) {
            existingAtelier.setDateCreation(atelierDTO.getDateCreation());
        }

        // Sauvegarder
        Atelier updatedAtelier = atelierRepository.save(existingAtelier);
        return convertToDTO(updatedAtelier);
    }

    public void deleteAtelier(UUID id) {
        Atelier atelier = atelierRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Atelier non trouvé avec l'ID: " + id));
        atelierRepository.delete(atelier);
    }

}