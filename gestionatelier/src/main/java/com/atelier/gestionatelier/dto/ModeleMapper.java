
package com.atelier.gestionatelier.mapper;

import com.atelier.gestionatelier.dto.CreateModeleDTO;
import com.atelier.gestionatelier.dto.ModeleDTO;
import com.atelier.gestionatelier.dto.ModeleListDTO;
import com.atelier.gestionatelier.dto.UpdateModeleDTO;
import com.atelier.gestionatelier.entities.Modele;
import com.atelier.gestionatelier.repositories.AtelierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ModeleMapper {

    private final AtelierRepository atelierRepository;

    public Modele toEntity(CreateModeleDTO dto) {
        if (dto == null) {
            return null;
        }

        return Modele.builder()
                .nom(dto.getNom())
                .description(dto.getDescription())
                .prix(dto.getPrix())
                .categorie(dto.getCategorie())
                .photoPath(dto.getPhotoPath())
                .estActif(dto.getEstActif() != null ? dto.getEstActif() : true)
                .atelier(atelierRepository.findById(dto.getAtelierId())
                        .orElseThrow(() -> new IllegalArgumentException("Atelier non trouvé")))
                .build();
    }

    public void updateEntityFromDTO(UpdateModeleDTO dto, Modele modele) {
        if (dto == null) return;

        if (dto.getNom() != null) {
            modele.setNom(dto.getNom());
        }
        if (dto.getDescription() != null) {
            modele.setDescription(dto.getDescription());
        }
        if (dto.getPrix() != null) {
            modele.setPrix(dto.getPrix());
        }
        if (dto.getCategorie() != null) {
            modele.setCategorie(dto.getCategorie());
        }
        if (dto.getPhotoPath() != null) {
            modele.setPhotoPath(dto.getPhotoPath());
        }
        if (dto.getEstActif() != null) {
            modele.setEstActif(dto.getEstActif());
        }
    }

    public ModeleDTO toDTO(Modele modele) {
        if (modele == null) {
            return null;
        }

        ModeleDTO dto = new ModeleDTO();
        dto.setId(modele.getId());
        dto.setNom(modele.getNom());
        dto.setDescription(modele.getDescription());
        dto.setPrix(modele.getPrix());
        dto.setPhotoPath(modele.getPhotoPath());
        dto.setCategorie(modele.getCategorie());
        dto.setEstActif(modele.getEstActif());
        dto.setDateCreation(modele.getDateCreation());
        dto.setDateModification(modele.getDateModification());

        if (modele.getAtelier() != null) {
            dto.setAtelierId(modele.getAtelier().getId());
            dto.setAtelierNom(modele.getAtelier().getNom());
        }

        return dto;
    }

    public ModeleListDTO toListDTO(Modele modele) {
        if (modele == null) {
            return null;
        }

        return new ModeleListDTO(
                modele.getId(),
                modele.getNom(),
                modele.getDescription(),
                modele.getPrix(),
                modele.getPhotoPath(),
                modele.getCategorie(),
                modele.getEstActif()
        );
    }
}