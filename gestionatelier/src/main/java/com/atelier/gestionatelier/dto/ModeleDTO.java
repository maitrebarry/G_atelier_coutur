package com.atelier.gestionatelier.dto;

import com.atelier.gestionatelier.entities.Modele.CategorieModele;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModeleDTO {

    private UUID id;
    private String nom;
    private String description;
    private Double prix;
    private String photoPath;
    private CategorieModele categorie;
    private Boolean estActif;
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
    private UUID atelierId;
    private String atelierNom;

    // URL complète pour l'affichage de la photo
    public String getPhotoUrl() {
        if (photoPath != null && !photoPath.trim().isEmpty()) {
            return "/api/modeles/photos/" + photoPath;
        }
        return null;
    }
}