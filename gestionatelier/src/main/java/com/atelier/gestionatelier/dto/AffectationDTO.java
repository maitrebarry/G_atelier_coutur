//  - Pour la réponse après création/consultation
package com.atelier.gestionatelier.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class AffectationDTO {
    private UUID id;
    private LocalDateTime dateCreation;
    private LocalDate dateEcheance;
    private LocalDateTime dateDebutReelle;
    private LocalDateTime dateFinReelle;
    private LocalDateTime dateValidation;

    @NotNull
    @Positive
    private Double prixTailleur;

    private String statut; // EN_ATTENTE, EN_COURS, TERMINE, VALIDE, ANNULE

    // Informations du client
    private ClientInfoDTO client;

    // Informations du tailleur
    private TailleurInfoDTO tailleur;

    // Informations de la mesure
    private MesureInfoDTO mesure;

    // Informations de l'atelier
    private AtelierInfoDTO atelier;

    @Data
    public static class ClientInfoDTO {
        private UUID id;
        private String nom;
        private String prenom;
        private String contact;
        private String adresse;
        private String email;
        private String photo;
        private LocalDateTime dateCreation;
    }

    @Data
    public static class TailleurInfoDTO {
        private UUID id;
        private String nom;
        private String prenom;
        private String email;
        private String role; // TAILLEUR
        private Boolean actif;
    }

    @Data
    public static class MesureInfoDTO {
        private UUID id;
        private String typeVetement;
        private Double prix; // Prix du modèle original
        private String photoPath;
        private LocalDateTime dateMesure;

        // Mesures principales pour affichage
        private Double epaule;
        private Double manche;
        private Double poitrine;
        private Double taille;
        private Double longueur;
    }

    @Data
    public static class AtelierInfoDTO {
        private UUID id;
        private String nom;
        private String adresse;
        private String telephone;
    }
}