package com.atelier.gestionatelier.dto;

import com.atelier.gestionatelier.entities.Modele.CategorieModele;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateModeleDTO {

    private String nom;
    private String description;

    @Min(value = 0, message = "Le prix doit être positif")
    private Double prix;

    private CategorieModele categorie;
    private String photoPath;
    private Boolean estActif;
}