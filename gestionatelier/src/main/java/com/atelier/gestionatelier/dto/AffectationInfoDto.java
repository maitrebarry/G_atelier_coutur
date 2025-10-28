package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AffectationInfoDto {
    private UUID affectationId;
    private String modeleNom;
    private Double prixTailleur; // Maintenant ça représente le prix du modèle pour le client
    private String statutAffectation;
    private LocalDateTime dateEcheance;
    private String tailleurNom;
    private String tailleurPrenom;

    // Nouvelles propriétés pour afficher les détails du modèle
    private String typeVetement;
    private String photoModele;
    private LocalDateTime dateMesure;
}