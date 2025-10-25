package com.atelier.gestionatelier.dto;

import com.atelier.gestionatelier.entities.Modele.CategorieModele;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModeleListDTO {

    private UUID id;
    private String nom;
    private String description;
    private Double prix;
    private String photoPath;
    private CategorieModele categorie;
    private Boolean estActif;

    // Getter pour l'URL de la photo
    public String getPhotoUrl() {
        if (photoPath != null && !photoPath.trim().isEmpty()) {
            return "/api/modeles/photos/" + photoPath;
        }
        return null;
    }

    // Getter pour le prix formaté
    public String getPrixFormatted() {
        if (prix != null) {
            return String.format("%,.0f FCFA", prix);
        }
        return "0 FCFA";
    }
}