package com.atelier.gestionatelier.dto;

import com.atelier.gestionatelier.entities.Modele.CategorieModele;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateModeleDTO {

    @NotBlank(message = "Le nom du modèle est obligatoire")
    private String nom;

    private String description;

    @NotNull(message = "Le prix est obligatoire")
    @Min(value = 0, message = "Le prix doit être positif")
    private Double prix;

    @NotNull(message = "La catégorie est obligatoire")
    private CategorieModele categorie;

    private String photoPath; // Optionnel - géré via upload

    @NotNull(message = "L'atelier est obligatoire")
    private UUID atelierId;

    private Boolean estActif;
}