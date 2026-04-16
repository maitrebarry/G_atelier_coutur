// RendezVousDTO.java
package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class RendezVousDTO {
    private UUID id;
    private LocalDateTime dateRDV;
    private String typeRendezVous;
    private String notes;
    private String statut;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Informations du client (simplifiées comme dans votre structure)
    private ClientInfoDTO client;

    // Informations de l'atelier
    private AtelierInfoDTO atelier;

    private MesureInfoDTO mesure;
    private Integer mesuresRestantesALivrer;

    @Data
    public static class ClientInfoDTO {
        private UUID id;
        private String nom;
        private String prenom;
        private String contact;
        private String adresse;
        private String email;
        private String photo;
    }

    @Data
    public static class AtelierInfoDTO {
        private UUID id;
        private String nom;
        private String adresse;
    }

    @Data
    public static class MesureInfoDTO {
        private UUID id;
        private String typeVetement;
        private String modeleNom;
        private String description;
        private Double prix;
        private String statutProduction;
        private Boolean pretPourLivraison;
        private String libelle;
    }
}